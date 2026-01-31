import express from 'express';
import { createMovie, getMovies, getMovieById, deleteMovie } from '../controllers/movieController.js';
import { upload } from '../config/cloudinary.js';

const movieRouter = express.Router();

// Define the file fields configuration
const fileFields = [
  { name: "poster", maxCount: 1 },
  { name: "trailerUrl", maxCount: 1 },
  { name: "videoUrl", maxCount: 1 },
  { name: "ltThumbnail", maxCount: 1 },
  { name: "castFiles", maxCount: 20 },
  { name: "directorFiles", maxCount: 20 },
  { name: "producerFiles", maxCount: 20 },
  { name: "ltDirectorFiles", maxCount: 20 },
  { name: "ltProducerFiles", maxCount: 20 },
  { name: "ltSingerFiles", maxCount: 20 },
];

// Apply the Cloudinary upload middleware with the file fields configuration
const uploadMiddleware = (req, res, next) => {
  upload.fields(fileFields)(req, res, (err) => {
    if (err) {
      console.error('❌ UPLOAD ERROR:', err.message);
      return res.status(400).json({ 
        success: false, 
        message: 'File upload failed',
        error: err.message 
      });
    }
    
    // Log successful upload
    if (req.files) {
      console.log('✅ Files uploaded to Cloudinary:', Object.keys(req.files));
      if (req.files.poster && req.files.poster[0]) {
        console.log('📸 Poster uploaded file object:', JSON.stringify(req.files.poster[0], null, 2));
        console.log('📸 Poster path (URL):', req.files.poster[0].path);
        console.log('📸 Poster filename (public_id):', req.files.poster[0].filename);
      }
    }
    
    next();
  });
};

// Apply the upload middleware to the route
movieRouter.post('/', uploadMiddleware, createMovie)

movieRouter.get('/', getMovies);
movieRouter.get('/:id', getMovieById);
movieRouter.delete('/:id', deleteMovie);

export default movieRouter;

