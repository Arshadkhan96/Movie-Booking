import mongoose from "mongoose";
import Movie from "../models/movieModel.js";
import { uploadBase64ToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

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

// Helper to extract public_id from Cloudinary URL
const extractPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  
  try {
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex === -1) return null;
    
    // Get everything after 'upload/'
    const afterUpload = urlParts.slice(uploadIndex + 2).join('/');
    
    // Remove file extension
    const publicId = afterUpload.replace(/\.[^/.]+$/, "");
    
    return publicId;
  } catch (error) {
    console.error("Error extracting public_id:", error);
    return null;
  }
};

// Upload person files (for cast, directors, producers)
const uploadPersonFiles = async (peopleArray, fieldName, req) => {
  if (!peopleArray || !Array.isArray(peopleArray)) return peopleArray;
  
  const updatedPeople = [...peopleArray];
  
  // Process file uploads from multer
  if (req.files?.[fieldName]) {
    req.files[fieldName].forEach((file, i) => {
      if (updatedPeople[i] && file.path) {
        updatedPeople[i].file = file.path; // Cloudinary URL
      } else if (file.path) {
        updatedPeople[i] = { 
          name: "", 
          role: "", 
          file: file.path 
        };
      }
    });
  }
  
  // Process Base64 images in people objects
  for (let i = 0; i < updatedPeople.length; i++) {
    const person = updatedPeople[i];
    if (person?.file && person.file.startsWith('data:image')) {
      try {
        console.log(`📤 Uploading Base64 image for ${fieldName}[${i}]...`);
        const result = await uploadBase64ToCloudinary(person.file);
        if (result?.url) {
          updatedPeople[i].file = result.url;
          console.log(`✅ Uploaded ${fieldName}[${i}] to Cloudinary`);
        }
      } catch (error) {
        console.error(`❌ Error uploading ${fieldName}[${i}]:`, error.message);
      }
    }
  }
  
  return updatedPeople;
};

// Convert person object to frontend-safe preview
const personToPreview = (p) => ({
  name: p?.name || "",
  role: p?.role || "",
  preview: p?.file || null,
});

// Normalize movie before sending to frontend
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
    
    console.log("\n🎬 CREATE MOVIE REQUEST =====================");
    console.log("📋 Body keys:", Object.keys(body));
    console.log("📁 Files received:", Object.keys(req.files || {}));
    console.log("===========================================\n");
    
    // ===== HANDLE POSTER =====
    let poster = null;
    
    // Option 1: Poster from file upload (multer)
    if (req.files?.poster?.[0]?.path) {
      poster = req.files.poster[0].path;
      console.log("✅ Poster from file upload:", poster.substring(0, 100) + "...");
    }
    // Option 2: Poster as Base64 in body
    else if (body.poster && (body.poster.startsWith('data:image') || body.poster.startsWith('http'))) {
      console.log("📤 Processing poster from body...");
      const result = await uploadBase64ToCloudinary(body.poster);
      if (result?.url) {
        poster = result.url;
        console.log("✅ Poster uploaded to Cloudinary:", poster.substring(0, 100) + "...");
      } else {
        console.log("❌ Failed to upload poster to Cloudinary");
      }
    }
    // Option 3: Poster in body (already a URL)
    else if (body.poster) {
      poster = body.poster;
      console.log("📝 Using poster from body:", poster.substring(0, 100) + "...");
    }
    
    // ===== HANDLE OTHER MEDIA FILES =====
    const trailerUrl = req.files?.trailerUrl?.[0]?.path || body.trailerUrl || null;
    const videoUrl = req.files?.videoUrl?.[0]?.path || body.videoUrl || null;
    
    // ===== PARSE ARRAYS =====
    const categories = safeParseJSON(body.categories) || 
                     (body.categories ? body.categories.split(",").map(s => s.trim()) : []);
    
    const slots = safeParseJSON(body.slots) || [];
    
    const seatPrices = safeParseJSON(body.seatPrices) || {
      standard: Number(body.standard || 0),
      recliner: Number(body.recliner || 0),
    };
    
    // ===== HANDLE PEOPLE (CAST, DIRECTORS, PRODUCERS) =====
    let cast = safeParseJSON(body.cast) || [];
    let directors = safeParseJSON(body.directors) || [];
    let producers = safeParseJSON(body.producers) || [];
    
    // Upload person images to Cloudinary
    console.log("\n👥 Uploading people images...");
    cast = await uploadPersonFiles(cast, "castFiles", req);
    directors = await uploadPersonFiles(directors, "directorFiles", req);
    producers = await uploadPersonFiles(producers, "producerFiles", req);
    console.log("✅ People images processed");
    
    // ===== LATEST TRAILER =====
    const latestTrailer = safeParseJSON(body.latestTrailer) || {};
    
    // Handle latest trailer thumbnail
    if (req.files?.ltThumbnail?.[0]?.path) {
      latestTrailer.thumbnail = req.files.ltThumbnail[0].path;
    } 
    else if (body.ltThumbnail && (body.ltThumbnail.startsWith('data:image') || body.ltThumbnail.startsWith('http'))) {
      const result = await uploadBase64ToCloudinary(body.ltThumbnail);
      if (result?.url) latestTrailer.thumbnail = result.url;
    }
    else if (body.ltThumbnail) {
      latestTrailer.thumbnail = body.ltThumbnail;
    }
    
    // Latest trailer metadata
    latestTrailer.title = body.ltTitle || latestTrailer.title || "";
    latestTrailer.url = body.ltUrl || latestTrailer.url || "";
    latestTrailer.videoId = body.ltVideoId || latestTrailer.videoId || "";
    
    // Latest trailer people
    console.log("\n🎬 Uploading latest trailer people...");
    latestTrailer.directors = await uploadPersonFiles(
      latestTrailer.directors || [], 
      "ltDirectorFiles", 
      req
    );
    latestTrailer.producers = await uploadPersonFiles(
      latestTrailer.producers || [], 
      "ltProducerFiles", 
      req
    );
    latestTrailer.singers = await uploadPersonFiles(
      latestTrailer.singers || [], 
      "ltSingerFiles", 
      req
    );
    console.log("✅ Latest trailer people processed");
    
    // ===== VALIDATION =====
    if (!poster) {
      console.warn("⚠️ No poster provided for movie");
    }
    
    if (!body.movieName) {
      return res.status(400).json({
        success: false,
        message: "Movie name is required"
      });
    }
    
    // ===== CREATE MOVIE DOCUMENT =====
    const movieData = {
      _id: new mongoose.Types.ObjectId(),
      type: body.type || "normal",
      movieName: body.movieName || "",
      categories,
      poster,
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
    
    console.log("\n💾 Saving movie to database...");
    const doc = new Movie(movieData);
    const saved = await doc.save();
    console.log("✅ Movie saved with ID:", saved._id);
    
    // ===== SEND RESPONSE =====
    const responseData = normalizeItemForOutput(saved.toObject());
    
    console.log("\n✅ MOVIE CREATION COMPLETE");
    console.log("🎬 Movie Name:", responseData.movieName);
    console.log("📸 Poster URL:", responseData.poster ? "Present" : "Missing");
    console.log("🏷️ Type:", responseData.type);
    console.log("===========================================\n");
    
    return res.status(201).json({
      success: true,
      message: "Movie created successfully",
      data: responseData,
    });
    
  } catch (err) {
    console.error("\n❌ CREATE MOVIE ERROR ======================");
    console.error("Error:", err.message);
    console.error("Stack:", err.stack);
    console.error("===========================================\n");
    
    // Clean up any uploaded files if error occurred
    if (req.files) {
      console.log("🧹 Cleaning up uploaded files due to error...");
      // Note: Cloudinary files are automatically stored, we can't easily delete them here
      // without tracking public_ids
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Failed to create movie",
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
}

/* ======================================================
   GET ALL MOVIES
====================================================== */

export async function getMovies(req, res) {
  try {
    console.log("📋 Fetching all movies...");
    
    const items = await Movie.find()
      .sort("-createdAt")
      .lean();

    const normalized = items.map(normalizeItemForOutput);

    console.log(`✅ Found ${normalized.length} movies`);
    
    res.json({
      success: true,
      total: normalized.length,
      items: normalized,
    });
  } catch (err) {
    console.error("❌ Get Movies Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch movies" 
    });
  }
}

/* ======================================================
   GET MOVIE BY ID
====================================================== */

export async function getMovieById(req, res) {
  try {
    const movieId = req.params.id;
    console.log(`🔍 Fetching movie with ID: ${movieId}`);
    
    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid movie ID" 
      });
    }
    
    const item = await Movie.findById(movieId).lean();
    
    if (!item) {
      console.log(`❌ Movie not found: ${movieId}`);
      return res.status(404).json({ 
        success: false, 
        message: "Movie not found" 
      });
    }

    console.log(`✅ Movie found: ${item.movieName}`);
    
    res.json({
      success: true,
      item: normalizeItemForOutput(item),
    });
  } catch (err) {
    console.error("❌ Get Movie Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch movie" 
    });
  }
}

/* ======================================================
   DELETE MOVIE
====================================================== */

export async function deleteMovie(req, res) {
  try {
    const movieId = req.params.id;
    console.log(`🗑️ Deleting movie with ID: ${movieId}`);
    
    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid movie ID" 
      });
    }
    
    const movie = await Movie.findById(movieId);
    
    if (!movie) {
      console.log(`❌ Movie not found: ${movieId}`);
      return res.status(404).json({ 
        success: false, 
        message: "Movie not found" 
      });
    }
    
    console.log(`📋 Movie to delete: ${movie.movieName}`);
    
    // Delete main files from Cloudinary
    console.log("🧹 Cleaning up Cloudinary files...");
    
    if (movie.poster) {
      const posterPublicId = extractPublicId(movie.poster);
      if (posterPublicId) {
        await deleteFromCloudinary(posterPublicId);
        console.log("✅ Deleted poster");
      }
    }
    
    if (movie.trailerUrl) {
      const trailerPublicId = extractPublicId(movie.trailerUrl);
      if (trailerPublicId) {
        await deleteFromCloudinary(trailerPublicId);
        console.log("✅ Deleted trailer");
      }
    }
    
    if (movie.videoUrl) {
      const videoPublicId = extractPublicId(movie.videoUrl);
      if (videoPublicId) {
        await deleteFromCloudinary(videoPublicId);
        console.log("✅ Deleted video");
      }
    }
    
    // Delete people files
    const people = [
      ...(movie.cast || []),
      ...(movie.directors || []),
      ...(movie.producers || []),
      ...(movie.latestTrailer?.directors || []),
      ...(movie.latestTrailer?.producers || []),
      ...(movie.latestTrailer?.singers || []),
    ];
    
    console.log(`🧑‍🤝‍🧑 Deleting ${people.length} people files...`);
    
    for (const p of people) {
      if (p?.file) {
        const publicId = extractPublicId(p.file);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      }
    }
    
    // Delete latest trailer thumbnail
    if (movie.latestTrailer?.thumbnail) {
      const thumbnailPublicId = extractPublicId(movie.latestTrailer.thumbnail);
      if (thumbnailPublicId) {
        await deleteFromCloudinary(thumbnailPublicId);
        console.log("✅ Deleted latest trailer thumbnail");
      }
    }
    
    // Delete from database
    await Movie.findByIdAndDelete(movieId);
    
    console.log(`✅ Movie "${movie.movieName}" deleted successfully`);
    
    res.json({ 
      success: true, 
      message: "Movie deleted successfully" 
    });
    
  } catch (err) {
    console.error("❌ Delete Movie Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete movie" 
    });
  }
}

export default {
  createMovie,
  getMovies,
  getMovieById,
  deleteMovie,
};