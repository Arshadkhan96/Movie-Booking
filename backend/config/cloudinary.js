import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

/* ================= INIT ================= */

export const initCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  console.log("✅ Cloudinary initialized with cloud:", process.env.CLOUDINARY_CLOUD_NAME);
  return cloudinary;
};

/* ================= MULTER-CLOUDINARY STORAGE ================= */

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "movie-booking",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "mp4", "mov", "avi", "mkv", "pdf"],
    resource_type: "auto",
    transformation: [{ width: 1000, height: 1500, crop: "limit" }]
  },
});

/* ================= MULTER CONFIG ================= */

export const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept images and videos
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/mov', 'video/avi', 'video/mkv'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only images and videos are allowed.`));
    }
  }
});

/* ================= HELPERS ================= */

export const normalizeUpload = (file) => {
  if (!file) return null;
  
  return {
    url: file.path,           // Cloudinary URL
    public_id: file.filename, // Cloudinary public_id
  };
};

export const uploadBase64ToCloudinary = async (base64String, folder = "movie-booking") => {
  try {
    if (!base64String) return null;
    
    // If it's already a URL, return it
    if (base64String.startsWith('http')) {
      return { 
        url: base64String,
        public_id: null 
      };
    }
    
    // Remove data URL prefix if present
    let cleanBase64 = base64String;
    if (base64String.includes(',')) {
      cleanBase64 = base64String.split(',')[1];
    }
    
    // Upload base64 to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:image/png;base64,${cleanBase64}`,
      {
        folder: folder,
        resource_type: "image"
      }
    );
    
    return {
      url: result.secure_url,
      public_id: result.public_id
    };
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error.message);
    return null;
  }
};

export const deleteFromCloudinary = async (public_id) => {
  try {
    if (!public_id) return;
    await cloudinary.uploader.destroy(public_id);
    console.log(`✅ Deleted from Cloudinary: ${public_id}`);
  } catch (err) {
    console.error("❌ Cloudinary delete error:", err.message);
  }
};

export { cloudinary };