import mongoose from "mongoose";
import Movie from "../models/movieModel.js";
import { cloudinary } from '../config/cloudinary.js';

// Cloudinary configuration is already done in the cloudinary.js file
const API_BASE = "https://res.cloudinary.com/movie-booking/image/upload/";

/* ---------------------- small helpers ---------------------- */
// Builds a full URL from Cloudinary file object
// IMPORTANT: Only accepts Cloudinary responses, no localhost URLs allowed
const getUploadUrl = (val) => {
  if (!val) return null;

  // Reject any localhost URLs immediately
  if (typeof val === 'string') {
    if (val.includes('localhost:') || val.includes('127.0.0.1:')) {
      console.error('ERROR: Localhost file URL detected. This indicates Cloudinary upload failed:', val);
      return null;
    }
    // If it's already a Cloudinary URL, return as is
    if (val.includes('res.cloudinary.com')) {
      return val;
    }
    // Reject any other string that's not a Cloudinary URL
    console.error('ERROR: Invalid URL format (not Cloudinary):', val);
    return null;
  }
  
  // Handle Cloudinary file object from multer-storage-cloudinary
  if (val && typeof val === 'object') {
    // Check for Cloudinary secure_url first (preferred) - this is what multer-storage-cloudinary provides
    if (val.secure_url) {
      return val.secure_url;
    }
    // Then check for url property
    if (val.url) {
      return val.url;
    }
    // Check for path as fallback
    if (val.path && val.path.includes('res.cloudinary.com')) {
      return val.path;
    }
  }
  
  // If we get here, the value is not in a recognized format
  console.error('ERROR: Invalid file reference. Expected Cloudinary object, got:', val);
  return null;
};

// Extract public_id from Cloudinary URL for deletion
const extractPublicId = (url) => {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  
  // If it's a Cloudinary URL, extract the public_id
  const matches = url.match(/upload\/(?:v\d+\/)?([^.]+\.\w+)(?:\.\w+)?$/);
  return matches ? matches[1].split('.')[0] : null;
};

// Delete a file from Cloudinary
const deleteFromCloudinary = async (url) => {
  try {
    const publicId = extractPublicId(url);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

// Safely parses JSON and returns null on failure   
const safeParseJSON = (v) => {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

// Normalizes a person file value to a simple filename
const normalizeLatestPersonFilename = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    const fn = extractFilenameFromUrl(value);
    return fn || value;
  }
  if (typeof value === "object") {
    const candidate =
      value.filename ||
      value.path ||
      value.url ||
      value.file ||
      value.image ||
      value.preview ||
      null;
    return candidate ? normalizeLatestPersonFilename(candidate) : null;
  }
  return null;
};

// Converts a person object into a {name, role, preview} format
const personToPreview = (p) => {
  if (!p) return { name: "", role: "", preview: null };
  const candidate = p.preview || p.file || p.image || p.url || null;
  return {
    name: p.name || "",
    role: p.role || "",
    preview: candidate ? getUploadUrl(candidate) : null,
  };
};

/* ---------------------- shared transformers ---------------------- */
const buildLatestTrailerPeople = (arr = []) =>
  (arr || []).map((p) => ({
    name: (p && p.name) || "",
    role: (p && p.role) || "",
    file: normalizeLatestPersonFilename(
      p && (p.file || p.preview || p.url || p.image)
    ),
  }));

const enrichLatestTrailerForOutput = (lt = {}) => {
  const copy = { ...lt };
  copy.thumbnail = copy.thumbnail
    ? getUploadUrl(copy.thumbnail)
    : copy.thumbnail || null;
  const mapPerson = (p) => {
    const c = { ...(p || {}) };
    c.preview = c.file
      ? getUploadUrl(c.file)
      : c.preview
      ? getUploadUrl(c.preview)
      : null;
    c.name = c.name || "";
    c.role = c.role || "";
    return c;
  };
  copy.directors = (copy.directors || []).map(mapPerson);
  copy.producers = (copy.producers || []).map(mapPerson);
  copy.singers = (copy.singers || []).map(mapPerson);
  return copy;
};

const normalizeItemForOutput = (it = {}) => {
  const obj = { ...it };
  obj.thumbnail = it.latestTrailer?.thumbnail
    ? getUploadUrl(it.latestTrailer.thumbnail)
    : it.poster
    ? getUploadUrl(it.poster)
    : null;
  obj.trailerUrl =
    it.trailerUrl || it.latestTrailer?.url || it.latestTrailer?.videoId || null;

  if (it.type === "latestTrailers" && it.latestTrailer) {
    const lt = it.latestTrailer;
    obj.genres = obj.genres || lt.genres || [];
    obj.year = obj.year || lt.year || null;
    obj.rating = obj.rating || lt.rating || null;
    obj.duration = obj.duration || lt.duration || null;
    obj.description = obj.description || lt.description || lt.excerpt || "";
  }

  obj.cast = (it.cast || []).map(personToPreview);
  obj.directors = (it.directors || []).map(personToPreview);
  obj.producers = (it.producers || []).map(personToPreview);

  if (it.latestTrailer)
    obj.latestTrailer = enrichLatestTrailerForOutput(it.latestTrailer);

  obj.auditorium = it.auditorium || null; // ✔ kept

  return obj;
};

/* ---------------------- CREATE MOVIE ---------------------- */
export async function createMovie(req, res) {
  try {
    const body = req.body || {};

    // CRITICAL: Only accept uploaded files from Cloudinary, never use body.poster as fallback
    const posterUrl = req.files?.poster?.[0]
      ? getUploadUrl(req.files.poster[0])
      : null;

    // CRITICAL: Only accept uploaded files from Cloudinary
    const trailerUrl = req.files?.trailerUrl?.[0]
      ? getUploadUrl(req.files.trailerUrl[0])
      : null;

    const videoUrl = req.files?.videoUrl?.[0]
      ? getUploadUrl(req.files.videoUrl[0])
      : null;

    const categories =
      safeParseJSON(body.categories) ||
      (body.categories
        ? String(body.categories)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : []);

    const slots = safeParseJSON(body.slots) || [];
    const seatPrices =
      safeParseJSON(body.seatPrices) || {
        standard: Number(body.standard || 0),
        recliner: Number(body.recliner || 0),
      };

    const cast = safeParseJSON(body.cast) || [];
    const directors = safeParseJSON(body.directors) || [];
    const producers = safeParseJSON(body.producers) || [];

    const attachFiles = (filesArrName, targetArr) => {
      if (!req.files?.[filesArrName]) return;
      req.files[filesArrName].forEach((file, idx) => {
        const fileUrl = getUploadUrl(file);
        if (targetArr[idx]) {
          targetArr[idx].file = fileUrl;
        } else {
          targetArr[idx] = { name: "", file: fileUrl };
        }
      });
    };

    attachFiles("castFiles", cast);
    attachFiles("directorFiles", directors);
    attachFiles("producerFiles", producers);

    const latestTrailerBody = safeParseJSON(body.latestTrailer) || {};

    // CRITICAL: Only accept uploaded files from Cloudinary
    if (req.files?.ltThumbnail?.[0]) {
      latestTrailerBody.thumbnail = getUploadUrl(req.files.ltThumbnail[0]);
    }

    if (body.ltVideoUrl) latestTrailerBody.videoId = body.ltVideoUrl;
    if (body.ltUrl) latestTrailerBody.url = body.ltUrl;
    if (body.ltTitle) latestTrailerBody.title = body.ltTitle;

    latestTrailerBody.directors = latestTrailerBody.directors || [];
    latestTrailerBody.producers = latestTrailerBody.producers || [];
    latestTrailerBody.singers = latestTrailerBody.singers || [];

    const attachLtFiles = (fieldName, arrName) => {
      if (!req.files?.[fieldName]) return;
      req.files[fieldName].forEach((file, idx) => {
        const fileUrl = getUploadUrl(file);
        if (latestTrailerBody[arrName][idx]) {
          latestTrailerBody[arrName][idx].file = fileUrl;
        } else {
          latestTrailerBody[arrName][idx] = { name: "", file: fileUrl };
        }
      });
    };
    attachLtFiles("ltDirectorFiles", "directors");
    attachLtFiles("ltProducerFiles", "producers");
    attachLtFiles("ltSingerFiles", "singers");

    latestTrailerBody.directors = buildLatestTrailerPeople(
      latestTrailerBody.directors
    );
    latestTrailerBody.producers = buildLatestTrailerPeople(
      latestTrailerBody.producers
    );
    latestTrailerBody.singers = buildLatestTrailerPeople(
      latestTrailerBody.singers
    );

    const auditoriumValue =
      typeof body.auditorium === "string" && body.auditorium.trim()
        ? String(body.auditorium).trim()
        : "Audi 1";

    const doc = new Movie({
      _id: new mongoose.Types.ObjectId(),
      type: body.type || "normal",
      movieName: body.movieName || body.title || "",
      categories,
      poster: posterUrl,
      trailerUrl,
      videoUrl,
      rating: Number(body.rating) || 0,
      duration: Number(body.duration) || 0,
      slots,
      seatPrices,
      cast,
      directors,
      producers,
      story: body.story || "",
      latestTrailer: latestTrailerBody,
      auditorium: auditoriumValue,
    });

    const saved = await doc.save();
    return res.status(201).json({
      success: true,
      message: "Movie created successfully.",
      data: saved,
    });
  } catch (err) {
    console.error("Create Movie Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error. Please try again later.",
    });
  }
}

/* ---------------------- GET ALL MOVIES ---------------------- */
export async function getMovies(req, res) {
  try {
    const {
      category,
      type,
      sort = "-createdAt",
      page = 1,
      limit = 520,
      search,
      latestTrailers,
    } = req.query;

    let filter = {};

    if (typeof category === "string" && category.trim())
      filter.categories = { $in: [category.trim()] };

    if (typeof type === "string" && type.trim()) filter.type = type.trim();

    if (typeof search === "string" && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { movieName: { $regex: q, $options: "i" } },
        { "latestTrailer.title": { $regex: q, $options: "i" } },
        { story: { $regex: q, $options: "i" } },
      ];
    }

    if (latestTrailers && String(latestTrailers).toLowerCase() !== "false") {
      filter =
        Object.keys(filter).length === 0
          ? { type: "latestTrailers" }
          : { $and: [filter, { type: "latestTrailers" }] };
    }

    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(200, parseInt(limit, 10) || 12);
    const skip = (pg - 1) * lim;

    const total = await Movie.countDocuments(filter);
    const items = await Movie.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(lim)
      .lean();

    const normalized = (items || []).map(normalizeItemForOutput);

    return res.json({
      success: true,
      total,
      page: pg,
      limit: lim,
      items: normalized,
    });
  } catch (error) {
    console.error("Get Movies Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error. Please try again later.",
    });
  }
}

/* ---------------------- GET MOVIE BY ID ---------------------- */
export async function getMovieById(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Movie ID is required.",
      });
    }

    const item = await Movie.findById(id).lean();
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Movie not found.",
      });
    }

    const obj = normalizeItemForOutput(item);

    if (item.type === "latestTrailers" && item.latestTrailer) {
      const lt = item.latestTrailer;
      obj.genres = obj.genres || lt.genres || [];
      obj.year = obj.year || lt.year || null;
      obj.rating = obj.rating || lt.rating || null;
      obj.duration = obj.duration || lt.duration || null;
      obj.description =
        obj.description || lt.description || lt.excerpt || "";
    }

    return res.json({ success: true, item: obj });
  } catch (error) {
    console.error("Get MoviesById Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error. Please try again later.",
    });
  }
}

/* ---------------------- DELETE MOVIE ---------------------- */
export async function deleteMovie(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Movie ID is required.",
      });
    }

    const movie = await Movie.findById(id);
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found.",
      });
    }

    // Delete main assets from Cloudinary
    if (movie.poster) await deleteFromCloudinary(movie.poster);
    if (movie.trailerUrl && movie.latestTrailer?.thumbnail) {
      await deleteFromCloudinary(movie.latestTrailer.thumbnail);
    }

    // Delete person files from Cloudinary
    const allPeople = [
      ...(movie.cast || []),
      ...(movie.directors || []),
      ...(movie.producers || []),
      ...(movie.latestTrailer?.directors || []),
      ...(movie.latestTrailer?.producers || []),
      ...(movie.latestTrailer?.singers || []),
    ];

    for (const person of allPeople) {
      if (person?.file) {
        await deleteFromCloudinary(person.file);
      }
    }

    // Delete the movie from the database
    await Movie.findByIdAndDelete(id);
    res.status(200).json({ message: 'Movie deleted successfully' });
  } catch (error) {
    console.error('Error deleting movie:', error);
    res.status(500).json({ message: 'Error deleting movie', error: error.message });
  }
};

export default {
  createMovie,
  getMovies,
  getMovieById,
  deleteMovie,
};