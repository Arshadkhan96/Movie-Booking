import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Initialize Cloudinary configuration
const initCloudinary = async () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Missing Cloudinary configuration. Please check your .env file');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  
  console.log('Cloudinary initialized successfully');
  return true;
};

// Create storage engine for Multer with Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'movie-booking',
    format: async (req, file) => {
      // Extract file extension from mimetype or originalname
      const format = file.mimetype.split('/')[1] || 'jpg';
      return format === 'jpeg' ? 'jpg' : format; // Cloudinary uses 'jpg' not 'jpeg'
    },
    public_id: (req, file) => {
      // Generate a unique public_id for each file
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      return `movie-${uniqueSuffix}`;
    },
    resource_type: 'auto',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'mkv'],
    transformation: [
      { width: 500, height: 750, crop: 'fill', quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  }
});

// Configure multer with the Cloudinary storage
const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB limit (increased for videos)
    files: 50 // Maximum number of files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only images and videos are allowed.`), false);
    }
  }
});

// Function to delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    return false;
  }
};

// Function to get public ID from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  const matches = url.match(/\/v\d+\/(.+?)(?:\.|$)/);
  return matches ? matches[1] : null;
};

// Initialize Cloudinary when this module is imported
const initializeCloudinary = async () => {
  try {
    await initCloudinary();
  } catch (error) {
    console.error('Failed to initialize Cloudinary:', error);
    throw error;
  }
};

export { 
  cloudinary, 
  upload, 
  deleteFromCloudinary, 
  getPublicIdFromUrl,
  initCloudinary,
  initializeCloudinary,
  storage
};

// Initialize Cloudinary immediately when this module is imported
initializeCloudinary().catch(console.error);
