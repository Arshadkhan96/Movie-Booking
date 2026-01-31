import mongoose from "mongoose";
import Movie from "../models/movieModel.js";
import { cloudinary, normalizeUpload } from "../config/cloudinary.js";

/* ======================================================
   HELPERS
====================================================== */

// Safe JSON parse
const safeParseJSON = (v) => {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

// Delete from Cloudinary using public_id ONLY
const deleteFromCloudinary = async (fileObj) => {
  try {
    if (!fileObj?.public_id) return;
    await cloudinary.uploader.destroy(fileObj.public_id);
  } catch (err) {
    console.error("Cloudinary delete error:", err);
  }
};

// Convert person object to frontend-safe preview
const personToPreview = (p) => ({
  name: p?.name || "",
  role: p?.role || "",
  preview: p?.file || null, // file is now a string URL
});

// Normalize movie before sending to frontend
const normalizeItemForOutput = (it = {}) => {
  const obj = { ...it };

  obj.thumbnail =
    it.poster || // poster is now a string URL
    it.latestTrailer?.thumbnail || // thumbnail is now a string URL
    null;

  obj.cast = (it.cast || []).map(personToPreview);
  obj.directors = (it.directors || []).map(personToPreview);
  obj.producers = (it.producers || []).map(personToPreview);

  if (it.latestTrailer) {
    obj.latestTrailer = {
      ...it.latestTrailer,
      thumbnail: it.latestTrailer.thumbnail || null, // thumbnail is now a string URL
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

    // Poster (ONLY from Cloudinary upload)
    const poster = req.files?.poster?.[0]
      ? normalizeUpload(req.files.poster[0])?.url
      : null;

    // Trailer thumbnail / video
    const trailerUrl = req.files?.trailerUrl?.[0]
      ? normalizeUpload(req.files.trailerUrl[0])?.url
      : null;

    const videoUrl = req.files?.videoUrl?.[0]
      ? normalizeUpload(req.files.videoUrl[0])?.url
      : null;

    const categories =
      safeParseJSON(body.categories) ||
      (body.categories
        ? body.categories.split(",").map((s) => s.trim())
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

    // Attach cast/director/producer files
    const attachFiles = (fieldName, arr) => {
      if (!req.files?.[fieldName]) return;
      req.files[fieldName].forEach((file, i) => {
        const normalized = normalizeUpload(file);
        if (!normalized) return;
        if (arr[i]) arr[i].file = normalized.url;
        else arr[i] = { name: "", role: "", file: normalized.url };
      });
    };

    attachFiles("castFiles", cast);
    attachFiles("directorFiles", directors);
    attachFiles("producerFiles", producers);

    /* ---------- Latest Trailer ---------- */

    const latestTrailer = safeParseJSON(body.latestTrailer) || {};

    if (req.files?.ltThumbnail?.[0]) {
      latestTrailer.thumbnail = normalizeUpload(req.files.ltThumbnail[0])?.url;
    }

    latestTrailer.title = body.ltTitle || latestTrailer.title || "";
    latestTrailer.url = body.ltUrl || latestTrailer.url || "";
    latestTrailer.videoId = body.ltVideoUrl || latestTrailer.videoId || "";

    latestTrailer.directors = latestTrailer.directors || [];
    latestTrailer.producers = latestTrailer.producers || [];
    latestTrailer.singers = latestTrailer.singers || [];

    const attachLtFiles = (field, arr) => {
      if (!req.files?.[field]) return;
      req.files[field].forEach((file, i) => {
        const normalized = normalizeUpload(file);
        if (!normalized) return;
        if (arr[i]) arr[i].file = normalized.url;
        else arr[i] = { name: "", role: "", file: normalized.url };
      });
    };

    attachLtFiles("ltDirectorFiles", latestTrailer.directors);
    attachLtFiles("ltProducerFiles", latestTrailer.producers);
    attachLtFiles("ltSingerFiles", latestTrailer.singers);

    /* ---------- Save Movie ---------- */

    const doc = new Movie({
      _id: new mongoose.Types.ObjectId(),
      type: body.type || "normal",
      movieName: body.movieName || body.title || "",
      categories,
      poster,
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
      latestTrailer,
      auditorium: body.auditorium || "Audi 1",
    });

    const saved = await doc.save();

    return res.status(201).json({
      success: true,
      message: "Movie created successfully",
      data: normalizeItemForOutput(saved.toObject()),
    });
  } catch (err) {
    console.error("Create Movie Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

/* ======================================================
   GET ALL MOVIES
====================================================== */

export async function getMovies(req, res) {
  try {
    const items = await Movie.find()
      .sort("-createdAt")
      .lean();

    const normalized = items.map(normalizeItemForOutput);

    res.json({
      success: true,
      total: normalized.length,
      items: normalized,
    });
  } catch (err) {
    console.error("Get Movies Error:", err);
    res.status(500).json({ success: false });
  }
}

/* ======================================================
   GET MOVIE BY ID
====================================================== */

export async function getMovieById(req, res) {
  try {
    const item = await Movie.findById(req.params.id).lean();
    if (!item) {
      return res.status(404).json({ success: false, message: "Movie not found" });
    }

    res.json({
      success: true,
      item: normalizeItemForOutput(item),
    });
  } catch (err) {
    console.error("Get Movie Error:", err);
    res.status(500).json({ success: false });
  }
}

/* ======================================================
   DELETE MOVIE
====================================================== */

export async function deleteMovie(req, res) {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ success: false, message: "Movie not found" });
    }

    // Delete main files
    await deleteFromCloudinary(movie.poster);
    await deleteFromCloudinary(movie.trailerUrl);
    await deleteFromCloudinary(movie.videoUrl);

    // Delete people files
    const people = [
      ...(movie.cast || []),
      ...(movie.directors || []),
      ...(movie.producers || []),
      ...(movie.latestTrailer?.directors || []),
      ...(movie.latestTrailer?.producers || []),
      ...(movie.latestTrailer?.singers || []),
    ];

    for (const p of people) {
      await deleteFromCloudinary(p.file);
    }

    if (movie.latestTrailer?.thumbnail) {
      await deleteFromCloudinary(movie.latestTrailer.thumbnail);
    }

    await Movie.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Movie deleted successfully" });
  } catch (err) {
    console.error("Delete Movie Error:", err);
    res.status(500).json({ success: false });
  }
}

export default {
  createMovie,
  getMovies,
  getMovieById,
  deleteMovie,
};
