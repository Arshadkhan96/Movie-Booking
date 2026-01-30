import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

/* ======================= INIT ======================= */

const initCloudinary = () => {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Missing Cloudinary environment variables");
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  console.log("✅ Cloudinary initialized");
};

initCloudinary();

/* ======================= MULTER STORAGE ======================= */

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "movie-booking",
    resource_type: "auto",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: "w_500,h_750,c_fill,q_auto,f_auto",
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, WEBP allowed"));
  },
});

/* ======================= DELETE ======================= */

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
  deleteFromCloudinary,
  initCloudinary,
};
