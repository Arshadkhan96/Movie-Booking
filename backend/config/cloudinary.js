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

// Create storage engine for Multer
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'movie-booking',
    public_id: `movie-${Date.now()}`,
    resource_type: 'auto',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 500, height: 750, crop: 'fill', quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  })
});

// Initialize multer with the storage engine
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.'));
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
