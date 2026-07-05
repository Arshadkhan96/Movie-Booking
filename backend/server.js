import express from "express";
import cors from "cors";
import dotenv from "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./config/db.js";
import { initCloudinary, cloudinary } from "./config/cloudinary.js";

// Initialize Cloudinary (fail fast if missing)
try {
  initCloudinary();
} catch (err) {
  console.error("Cloudinary initialization failed:", err.message);
  process.exit(1);
}

import userRouter from "./routes/userRoute.js";
import movieRouter from "./routes/movieRoute.js";
import bookingRouter from "./routes/bookingRoute.js";

// ES module __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

/* =======================
   CORS CONFIG
======================= */
const allowedOrigins = [
  "https://movie-admin-panel.netlify.app",
  "https://cine-ticket-hub.netlify.app",
  "https://movie-booking-n2fg.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`🌐 CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "cache-control"],
  })
);

/* =======================
   BODY PARSER
======================= */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ 
  extended: true, 
  limit: "50mb",
  parameterLimit: 100000 // Increase parameter limit for large Base64 strings
}));

/* =======================
   REQUEST LOGGING MIDDLEWARE
======================= */
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log after response is sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  
  // Special logging for movie creation
  if (req.url.includes('/api/movies') && req.method === 'POST' && !req.url.includes('/test/')) {
    console.log('\n🎬 MOVIE CREATION REQUEST INCOMING ============');
    console.log('Headers:', {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length']
    });
    
    // Log body info (but not the full Base64 to avoid console spam)
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Body contains fields:', Object.keys(req.body));
      
      if (req.body.poster) {
        const posterPreview = req.body.poster.substring(0, 100);
        console.log('Poster preview:', posterPreview + '...');
        console.log('Poster type:', req.body.poster.startsWith('data:image') ? 'Base64' : 'URL/other');
        console.log('Poster length:', req.body.poster.length);
      }
    }
    console.log('=============================================\n');
  }
  
  next();
});

/* =======================
   ROUTES
======================= */
app.use("/api/auth", userRouter);
app.use("/api/movies", movieRouter);
app.use("/api/bookings", bookingRouter);

/* =======================
   HEALTH CHECK & INFO
======================= */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🎬 Movie Booking API is Running",
    version: "1.0.0",
    endpoints: {
      movies: "/api/movies",
      auth: "/api/auth",
      bookings: "/api/bookings",
      test: {
        cloudinary: "/api/movies/test/cloudinary",
        upload: "/api/movies/test/upload"
      }
    },
    environment: process.env.NODE_ENV || 'development',
    cloudinary: process.env.CLOUD_NAME ? "Configured" : "Not Configured"
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/* =======================
   ERROR HANDLER
======================= */
app.use((err, req, res, next) => {
  console.error('\n❌ GLOBAL ERROR HANDLER ======================');
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('=============================================\n');
  
  // Handle CORS errors
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS Error: Origin not allowed",
      allowedOrigins: allowedOrigins
    });
  }
  
  // Handle multer/file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: "File too large. Maximum size is 50MB"
    });
  }
  
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`
  });
});

/* =======================
   START SERVER
======================= */
const startServer = async () => {
  try {
    console.log('\n🚀 STARTING MOVIE BOOKING SERVER =============');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Port:', port);
    console.log('Database:', process.env.MONGODB_URI ? 'Configured' : 'Not configured');
    console.log('Cloudinary:', process.env.CLOUD_NAME ? 'Configured' : 'Not configured');
    
    await connectDB();
    console.log("✅ MongoDB Connected");
    
    // Test Cloudinary connection before starting server
    console.log('🌤️ Testing Cloudinary connection...');
    try {
      const pingResult = await cloudinary.api.ping();
      console.log('✅ Cloudinary connection verified:', pingResult);
    } catch (cloudinaryError) {
      console.log('⚠️ Cloudinary connection test failed:', cloudinaryError.message);
      console.log('Make sure your Cloudinary credentials are correct in .env file');
    }
    
    app.listen(port, () => {
      console.log(`✅ Server running on port ${port}`);
      console.log(`✅ API Base URL: http://localhost:${port}`);
      console.log(`✅ Cloudinary: ${process.env.CLOUD_NAME || 'Not configured'}`);
      console.log('=============================================\n');
    });
  } catch (error) {
    console.error('\n❌ SERVER START FAILED ======================');
    console.error('Error:', error.message);
    console.error('=============================================\n');
    process.exit(1);
  }
};

startServer();
