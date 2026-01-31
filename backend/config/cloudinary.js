import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import path from "path";

/* ======================= INIT ======================= */

const initCloudinary = () => {
  // Check if all required Cloudinary environment variables are present
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.log("⚠️  Missing Cloudinary environment variables, using local storage");
    return false;
  }

  // Check for placeholder/default values that indicate invalid credentials
  if (
    process.env.CLOUDINARY_CLOUD_NAME === 'your-cloud-name' ||
    process.env.CLOUDINARY_API_KEY === 'your-api-key' ||
    process.env.CLOUDINARY_API_SECRET === 'your-api-secret'
  ) {
    console.log("⚠️  Using placeholder Cloudinary credentials, using local storage");
    return false;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  console.log("✅ Cloudinary initialized");
  return true;
};

const cloudinaryEnabled = initCloudinary();

/* ======================= MULTER STORAGE ======================= */

let storage;

if (cloudinaryEnabled) {
  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "movie-booking",
      resource_type: "auto",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
    },
  });
} else {
  // Fallback to local storage
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Image file format ${file.mimetype.split('/')[1]} not allowed`));
  },
});

/* ======================= NORMALIZE UPLOAD ======================= */

// Normalize both Cloudinary and local uploads
const normalizeUpload = (file) => {
  if (!file) return null;

  // Cloudinary upload - check multiple possible URL properties
  const url = file.secure_url || file.url || file.path;
  const publicId = file.public_id || file.filename;

  console.log('🔍 Normalizing upload:', { url, publicId, hasUrl: !!url, hasPublicId: !!publicId });

  if (url && publicId) {
    const result = {
      url: url,
      public_id: publicId,
    };
    console.log('✅ Normalized to:', result);
    return result;
  }

  // Local upload fallback
  if (file.filename && file.path) {
    const result = {
      url: `http://localhost:5000/uploads/${file.filename}`,
      public_id: file.filename, // Use filename as public_id for local files
    };
    console.log('🏠 Fallback to local:', result);
    return result;
  }

  console.log('⚠️ Unable to normalize upload for file:', file);
  return null;
};

const deleteFromCloudinary = async (public_id) => {
  try {
    if (!public_id) return;
    await cloudinary.uploader.destroy(public_id);
  } catch (err) {
    console.error("❌ Cloudinary delete error:", err);
  }
};

export {
  cloudinary,
  upload,
  normalizeUpload,
  deleteFromCloudinary,
  initCloudinary,
};
