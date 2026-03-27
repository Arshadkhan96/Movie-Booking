import mongoose from "mongoose";
import Movie from "../models/movieModel.js";
import {
  uploadBase64ToCloudinary,
  deleteFromCloudinary,
  isCloudinaryConfigured,
} from "../config/cloudinary.js";

/* ======================================================
   HELPERS
====================================================== */

const safeParseJSON = (v) => {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const extractPublicId = (url) => {
  if (!url || !url.includes("cloudinary.com")) return null;

  try {
    const urlParts = url.split("/");
    const uploadIndex = urlParts.indexOf("upload");
    if (uploadIndex === -1) return null;
    const afterUpload = urlParts.slice(uploadIndex + 2).join("/");
    return afterUpload.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
};

// Normalize any value (multer file or string) into a Cloudinary URL, otherwise null
const toCloudinaryUrl = (input) => {
  if (!input) return null;
  const url =
    typeof input === "string"
      ? input
      : input.path || input.secure_url || input.url || null;
  return url && url.includes("cloudinary.com") ? url : null;
};

// Upload person files (for cast, directors, producers)
const uploadPersonFiles = async (peopleArray, fieldName, req) => {
  if (!peopleArray || !Array.isArray(peopleArray)) return peopleArray;

  const updated = [...peopleArray];

  // Multer uploads (already on Cloudinary)
  if (req.files?.[fieldName]) {
    req.files[fieldName].forEach((file, i) => {
      const url = toCloudinaryUrl(file);
      if (!url) return;
      if (updated[i]) {
        updated[i].file = url;
      } else {
        updated[i] = { name: "", role: "", file: url };
      }
    });
  }

  // Base64 uploads inside objects
  for (let i = 0; i < updated.length; i++) {
    const person = updated[i];
    if (person?.file && person.file.startsWith("data:image")) {
      const result = await uploadBase64ToCloudinary(person.file);
      if (result?.url) updated[i].file = result.url;
    } else if (person?.file) {
      // Strip any leftover local paths (e.g., "uploads/filename.png") to avoid persisting non-Cloudinary URLs
      const normalized = toCloudinaryUrl(person.file);
      updated[i].file = normalized || null;
    }
  }

  return updated;
};

const personToPreview = (p) => ({
  name: p?.name || "",
  role: p?.role || "",
  preview: p?.file || null,
});

const normalizeItemForOutput = (it = {}) => {
  const obj = { ...it };

  obj.thumbnail = it.poster || it.latestTrailer?.thumbnail || null;
  obj.cast = (it.cast || []).map(personToPreview);
  obj.directors = (it.directors || []).map(personToPreview);
  obj.producers = (it.producers || []).map(personToPreview);

  if (it.latestTrailer) {
    obj.latestTrailer = {
      ...it.latestTrailer,
      thumbnail: it.latestTrailer.thumbnail || null,
      directors: (it.latestTrailer.directors || []).map(personToPreview),
      producers: (it.latestTrailer.producers || []).map(personToPreview),
      singers: (it.latestTrailer.singers || []).map(personToPreview),
    };
  }

  return obj;
};

/* ======================================================
   CREATE MOVIE
====================================================== */

export async function createMovie(req, res) {
  try {
    const body = req.body || {};

    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        success: false,
        message:
          "Image upload service (Cloudinary) is not configured. Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET.",
      });
    }

    console.log("\nCREATE MOVIE REQUEST");
    console.log("Body keys:", Object.keys(body));
    console.log("Files received:", Object.keys(req.files || {}));

    // ===== HANDLE POSTER =====
    let poster = toCloudinaryUrl(req.files?.poster?.[0]);

    if (!poster && body.poster && (body.poster.startsWith("data:image") || body.poster.startsWith("http"))) {
      const result = await uploadBase64ToCloudinary(body.poster);
      if (result?.url) poster = result.url;
    } else if (!poster && body.poster) {
      poster = toCloudinaryUrl(body.poster);
    }

    const looksCloudinary = (u) => typeof u === "string" && u.includes("cloudinary.com");
    if (!poster || !looksCloudinary(poster)) {
      return res.status(400).json({
        success: false,
        message:
          "Poster must be uploaded to Cloudinary. Send multipart/form-data with field name 'poster' or provide a Cloudinary URL.",
        receivedPoster: poster,
      });
    }

    // ===== HANDLE OTHER MEDIA FILES =====
    const trailerUrl =
      toCloudinaryUrl(req.files?.trailerUrl?.[0]) || toCloudinaryUrl(body.trailerUrl) || null;
    const videoUrl =
      toCloudinaryUrl(req.files?.videoUrl?.[0]) || toCloudinaryUrl(body.videoUrl) || null;

    // ===== PARSE ARRAYS =====
    const categories =
      safeParseJSON(body.categories) ||
      (body.categories ? body.categories.split(",").map((s) => s.trim()) : []);

    const slots = safeParseJSON(body.slots) || [];

    const seatPrices = safeParseJSON(body.seatPrices) || {
      standard: Number(body.standard || 0),
      recliner: Number(body.recliner || 0),
    };

    // ===== PEOPLE =====
    let cast = safeParseJSON(body.cast) || [];
    let directors = safeParseJSON(body.directors) || [];
    let producers = safeParseJSON(body.producers) || [];

    cast = await uploadPersonFiles(cast, "castFiles", req);
    directors = await uploadPersonFiles(directors, "directorFiles", req);
    producers = await uploadPersonFiles(producers, "producerFiles", req);

    // ===== LATEST TRAILER =====
    const latestTrailer = safeParseJSON(body.latestTrailer) || {};

    if (req.files?.ltThumbnail?.[0]) {
      latestTrailer.thumbnail = toCloudinaryUrl(req.files.ltThumbnail[0]);
    } else if (body.ltThumbnail && (body.ltThumbnail.startsWith("data:image") || body.ltThumbnail.startsWith("http"))) {
      const result = await uploadBase64ToCloudinary(body.ltThumbnail);
      if (result?.url) latestTrailer.thumbnail = result.url;
    } else if (body.ltThumbnail) {
      latestTrailer.thumbnail = toCloudinaryUrl(body.ltThumbnail);
    }

    // ===== CREATE DOCUMENT =====
    const movieData = {
      movieName: body.movieName || "",
      type: ["normal", "featured", "releaseSoon", "latestTrailers"].includes(body.type)
        ? body.type
        : "normal",
      categories,
      poster,
      thumbnail: poster,
      trailerUrl,
      videoUrl,
      rating: Number(body.rating) || 0,
      duration: Number(body.duration) || 120,
      slots,
      seatPrices,
      cast,
      directors,
      producers,
      story: body.story || "",
      latestTrailer,
      auditorium: body.auditorium || "Audi 1",
    };

    const doc = new Movie(movieData);
    const saved = await doc.save();

    const responseData = normalizeItemForOutput(saved.toObject());
    return res.status(201).json({
      success: true,
      message: "Movie created successfully",
      data: responseData,
    });
  } catch (err) {
    console.error("CREATE MOVIE ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to create movie",
      error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
    });
  }
}

/* ======================================================
   GET ALL MOVIES
====================================================== */

export async function getMovies(req, res) {
  try {
    const items = await Movie.find().sort("-createdAt").lean();
    const normalized = items.map(normalizeItemForOutput);
    res.json({ success: true, total: normalized.length, items: normalized });
  } catch (err) {
    console.error("Get Movies Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch movies",
    });
  }
}

/* ======================================================
   GET MOVIE BY ID
====================================================== */

export async function getMovieById(req, res) {
  try {
    const movieId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({ success: false, message: "Invalid movie ID" });
    }

    const item = await Movie.findById(movieId).lean();
    if (!item) {
      return res.status(404).json({ success: false, message: "Movie not found" });
    }

    res.json({ success: true, item: normalizeItemForOutput(item) });
  } catch (err) {
    console.error("Get Movie Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch movie",
    });
  }
}

/* ======================================================
   DELETE MOVIE
====================================================== */

export async function deleteMovie(req, res) {
  try {
    const movieId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({ success: false, message: "Invalid movie ID" });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ success: false, message: "Movie not found" });
    }

    // Delete Cloudinary assets
    const maybeDelete = async (url) => {
      const pid = extractPublicId(url);
      if (pid) await deleteFromCloudinary(pid);
    };

    await maybeDelete(movie.poster);
    await maybeDelete(movie.trailerUrl);
    await maybeDelete(movie.videoUrl);

    const people = [
      ...(movie.cast || []),
      ...(movie.directors || []),
      ...(movie.producers || []),
      ...(movie.latestTrailer?.directors || []),
      ...(movie.latestTrailer?.producers || []),
      ...(movie.latestTrailer?.singers || []),
    ];
    for (const p of people) {
      if (p?.file) await maybeDelete(p.file);
    }
    if (movie.latestTrailer?.thumbnail) {
      await maybeDelete(movie.latestTrailer.thumbnail);
    }

    await Movie.findByIdAndDelete(movieId);
    res.json({ success: true, message: "Movie deleted successfully" });
  } catch (err) {
    console.error("Delete Movie Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete movie",
    });
  }
}

export default {
  createMovie,
  getMovies,
  getMovieById,
  deleteMovie,
};
