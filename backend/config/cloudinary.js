import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

/* ================= INIT ================= */

export const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUD_NAME &&
    process.env.CLOUD_API_KEY &&
    process.env.CLOUD_API_SECRET
  );

const assertCloudinary = () => {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary credentials are missing. Set CLOUD_NAME / CLOUD_API_KEY / CLOUD_API_SECRET."
    );
  }
};

export const initCloudinary = () => {
  console.log('\n🌤️ CLOUDINARY CONFIGURATION CHECK =================');
  console.log('Cloud Name Loaded:', process.env.CLOUD_NAME ? '✅ YES' : '❌ NO');
  console.log('API Key Loaded:', process.env.CLOUD_API_KEY ? '✅ YES' : '❌ NO');
  console.log('API Secret Loaded:', process.env.CLOUD_API_SECRET ? '✅ YES' : '❌ NO');
  console.log('===================================================\n');
  
  assertCloudinary();

  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
    secure: true,
  });

  console.log("✅ Cloudinary initialized with cloud:", process.env.CLOUD_NAME);
  return cloudinary;
};

/* ================= MULTER-CLOUDINARY STORAGE ================= */

// Single Cloudinary-backed multer storage (no local disk fallback)
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    assertCloudinary();

    const safeName = file.originalname
      ? file.originalname.replace(/\s+/g, "-")
      : `upload-${Date.now()}`;

    return {
      folder: "movies",
      resource_type: "auto",
      public_id: `${Date.now()}-${safeName}`,
      transformation: file.mimetype.startsWith("image/")
        ? [{ width: 1000, height: 1500, crop: "limit" }]
        : undefined,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    };
  },
});

/* ================= MULTER CONFIG ================= */

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

// The one and only multer instance used across the app
export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  fileFilter: (req, file, cb) => {
    try {
      assertCloudinary();
    } catch (err) {
      return cb(err);
    }

    if (allowedMimeTypes.has(file.mimetype)) return cb(null, true);
    cb(new Error(`Invalid file type: ${file.mimetype}. Only images (jpg, png, jpeg, webp) are allowed.`));
  },
});

/* ================= HELPERS ================= */

export const normalizeUpload = (file) => {
  if (!file) return null;
  const url = file.path || file.secure_url || file.url || null;
  const public_id = file.filename || file.public_id || null;
  if (!url || !url.includes("cloudinary.com")) return null;

  return { url, public_id };
};

export const uploadBase64ToCloudinary = async (base64String, folder = "movies") => {
  try {
    if (!base64String) return null;
    assertCloudinary();

    // If it's already a URL, return it
    if (base64String.startsWith("http")) {
      return {
        url: base64String,
        public_id: null,
      };
    }

    // Remove data URL prefix if present
    let cleanBase64 = base64String;
    if (base64String.includes(",")) {
      cleanBase64 = base64String.split(",")[1];
    }

    console.log('📤 Uploading to Cloudinary:', {
      folder,
      base64Length: cleanBase64.length,
      preview: cleanBase64.substring(0, 50) + '...'
    });

    const result = await cloudinary.uploader.upload(
      `data:image/png;base64,${cleanBase64}`,
      {
        folder,
        resource_type: "image",
      }
    );

    console.log('✅ Cloudinary upload successful:', {
      public_id: result.public_id,
      url: result.secure_url.substring(0, 80) + '...'
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', {
      message: error.message,
      code: error.code,
      http_code: error.http_code,
      folder: folder,
      timestamp: new Date().toISOString()
    });
    return null;
  }
};

export const deleteFromCloudinary = async (public_id) => {
  try {
    if (!public_id) return;
    if (!isCloudinaryConfigured()) return;
    await cloudinary.uploader.destroy(public_id);
    console.log(`✅ Deleted from Cloudinary: ${public_id}`);
  } catch (err) {
    console.error("❌ Cloudinary delete error:", err.message);
  }
};

export { cloudinary };
