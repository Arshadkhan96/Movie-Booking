// import express from 'express';
// import { createMovie, getMovies, getMovieById, deleteMovie } from '../controllers/movieController.js';
// import { upload } from '../config/cloudinary.js';

// const movieRouter = express.Router();

// // Define the file fields configuration
// const fileFields = [
//   { name: "poster", maxCount: 1 },
//   { name: "trailerUrl", maxCount: 1 },
//   { name: "videoUrl", maxCount: 1 },
//   { name: "ltThumbnail", maxCount: 1 },
//   { name: "castFiles", maxCount: 20 },
//   { name: "directorFiles", maxCount: 20 },
//   { name: "producerFiles", maxCount: 20 },
//   { name: "ltDirectorFiles", maxCount: 20 },
//   { name: "ltProducerFiles", maxCount: 20 },
//   { name: "ltSingerFiles", maxCount: 20 },
// ];

// // Apply the Cloudinary upload middleware with the file fields configuration
// const uploadMiddleware = (req, res, next) => {
//   upload.fields(fileFields)(req, res, (err) => {
//     if (err) {
//       console.error('❌ UPLOAD ERROR:', err.message);
//       return res.status(400).json({ 
//         success: false, 
//         message: 'File upload failed',
//         error: err.message 
//       });
//     }
    
//     // Log successful upload
//     if (req.files) {
//       console.log('✅ Files uploaded to Cloudinary:', Object.keys(req.files));
//       if (req.files.poster && req.files.poster[0]) {
//         console.log('📸 Poster uploaded file object:', JSON.stringify(req.files.poster[0], null, 2));
//         console.log('📸 Poster path (URL):', req.files.poster[0].path);
//         console.log('📸 Poster filename (public_id):', req.files.poster[0].filename);
//       }
//     }
    
//     next();
//   });
// };

// // Apply the upload middleware to the route
// movieRouter.post('/', uploadMiddleware, createMovie)

// movieRouter.get('/', getMovies);
// movieRouter.get('/:id', getMovieById);
// movieRouter.delete('/:id', deleteMovie);

// export default movieRouter;


import express from 'express';
import { createMovie, getMovies, getMovieById, deleteMovie } from '../controllers/movieController.js';
import { upload, cloudinary } from '../config/cloudinary.js';

const movieRouter = express.Router();

// Apply the Cloudinary upload middleware for single poster file
const uploadMiddleware = (req, res, next) => {
  console.log('\n📤 FILE UPLOAD MIDDLEWARE ======================');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  // Fail fast if Cloudinary isn't configured
  if (!process.env.CLOUD_NAME || !process.env.CLOUD_API_KEY || !process.env.CLOUD_API_SECRET) {
    return res.status(500).json({
      success: false,
      message: "Cloudinary credentials are missing. Set CLOUD_NAME / CLOUD_API_KEY / CLOUD_API_SECRET.",
    });
  }
  
  console.log('🔄 Processing request with multer (CloudinaryStorage)...');
  
  upload.single('poster')(req, res, (err) => {
    if (err) {
      console.error('❌ UPLOAD ERROR:', err.message);
      return res.status(400).json({ 
        success: false, 
        message: 'File upload failed',
        error: err.message 
      });
    }
    
    // Log successful upload
    console.log('✅ Upload middleware completed');
    
    if (req.file) {
      console.log('📁 Poster file uploaded:');
      console.log(`   Original name: ${req.file.originalname}`);
      console.log(`   URL: ${req.file.path.substring(0, 80)}...`);
      console.log(`   ✅ Cloudinary: ${req.file.path.includes('cloudinary.com') ? 'YES' : 'NO'}`);
    } else {
      console.log('📭 No poster file uploaded via multer');
      if (req.body.poster) {
        console.log('📝 Poster in body:', 
          req.body.poster.substring(0, 50) + 
          (req.body.poster.length > 50 ? '...' : ''));
      }
    }

    // Log req.file for Cloudinary verification
    console.log('🔍 req.file:', req.file ? {
      field: req.file.fieldname,
      path: req.file.path,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      isCloudinary: req.file.path?.includes('cloudinary.com')
    } : null);
    
    console.log('=============================================\n');
    next();
  });
};

// Apply routes
movieRouter.post('/', uploadMiddleware, createMovie);
movieRouter.get('/', getMovies);
movieRouter.get('/:id', getMovieById);
movieRouter.delete('/:id', deleteMovie);

// ===== TEST ENDPOINTS =====

// Test Cloudinary connection
movieRouter.get('/test/cloudinary', async (req, res) => {
  try {
    const result = await cloudinary.api.ping();
    
    // Try to get resources
    let resources = [];
    try {
      const resourcesResult = await cloudinary.api.resources({
        max_results: 5,
        type: 'upload'
      });
      resources = resourcesResult.resources || [];
    } catch (resourcesError) {
      console.log("Could not fetch resources:", resourcesError.message);
    }
    
    res.json({
      success: true,
      message: 'Cloudinary is connected',
      ping: result,
      config: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key_set: !!process.env.CLOUDINARY_API_KEY,
        api_secret_set: !!process.env.CLOUDINARY_API_SECRET
      },
      resources_count: resources.length,
      sample_resources: resources.map(r => ({
        url: r.secure_url,
        format: r.format,
        size: r.bytes
      }))
    });
  } catch (error) {
    console.error('Cloudinary test error:', error);
    res.status(500).json({
      success: false,
      message: 'Cloudinary test failed',
      error: error.message
    });
  }
});

// Test file upload
movieRouter.post('/test/upload', upload.single('poster'), (req, res) => {
  console.log('\n🧪 TEST UPLOAD ENDPOINT ======================');
  
  const response = {
    success: true,
    message: 'Test upload completed',
    request_info: {
      method: req.method,
      url: req.url,
      contentType: req.headers['content-type']
    },
    file: null,
    body_fields: Object.keys(req.body || {})
  };
  
  if (req.file) {
    response.file = {
      originalname: req.file.originalname,
      cloudinary_url: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    };
  }
  
  console.log('Test response:', JSON.stringify(response, null, 2));
  console.log('=============================================\n');
  
  res.json(response);
});

export default movieRouter;
