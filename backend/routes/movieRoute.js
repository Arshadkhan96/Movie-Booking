import express from 'express';
import { createMovie, getMovies, getMovieById, deleteMovie } from '../controllers/movieController.js';
import { upload, cloudinary } from '../config/cloudinary.js';

const movieRouter = express.Router();

// Define the file fields configuration
const fileFields = [
  { name: "poster", maxCount: 1 },
  { name: "castFiles", maxCount: 20 },
  { name: "directorFiles", maxCount: 20 },
  { name: "producerFiles", maxCount: 20 },
];

// Apply the Cloudinary upload middleware for multiple file fields
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
    console.log('✅ Upload middleware completed');
    
    if (req.files) {
      console.log('📁 Files uploaded via multer:');
      Object.keys(req.files).forEach(fieldName => {
        const files = req.files[fieldName];
        console.log(`   ${fieldName}: ${files.length} file(s)`);
        files.forEach((file, idx) => {
          console.log(`     [${idx}] Original name: ${file.originalname}`);
          console.log(`         URL: ${file.path.substring(0, 80)}...`);
          console.log(`         ✅ Cloudinary: ${file.path.includes('cloudinary.com') ? 'YES' : 'NO'}`);
        });
      });
    } else {
      console.log('📭 No files uploaded via multer');
      if (req.body.poster) {
        console.log('📝 Poster in body:', 
          req.body.poster.substring(0, 50) + 
          (req.body.poster.length > 50 ? '...' : ''));
      }
    }

    // Log req.files for Cloudinary verification
    console.log('🔍 req.files:', req.files ? Object.keys(req.files) : null);
    
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
        cloud_name: process.env.CLOUD_NAME,
        api_key_set: !!process.env.CLOUD_API_KEY,
        api_secret_set: !!process.env.CLOUD_API_SECRET
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
movieRouter.post('/test/upload', upload.fields(fileFields), (req, res) => {
  console.log('\n🧪 TEST UPLOAD ENDPOINT ======================');
  
  const response = {
    success: true,
    message: 'Test upload completed',
    request_info: {
      method: req.method,
      url: req.url,
      contentType: req.headers['content-type']
    },
    files: {},
    body_fields: Object.keys(req.body || {})
  };
  
  if (req.files) {
    Object.keys(req.files).forEach(fieldName => {
      response.files[fieldName] = req.files[fieldName].map(file => ({
        originalname: file.originalname,
        cloudinary_url: file.path,
        size: file.size,
        mimetype: file.mimetype
      }));
    });
  }
  
  console.log('Test response:', JSON.stringify(response, null, 2));
  console.log('=============================================\n');
  
  res.json(response);
});

export default movieRouter;
