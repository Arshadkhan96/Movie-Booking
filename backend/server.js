import express from "express"
import cors from "cors"
import dotenv from "dotenv/config"
import { connectDB } from "./config/db.js";
import userRouter from "./routes/userRoute.js";
import movieRouter from "./routes/movieRoute.js";
import path from "path";
import { fileURLToPath } from 'url';
import bookingRouter from "./routes/bookingRoute.js";
import { initCloudinary } from "./config/cloudinary.js";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',  // Frontend development server (Vite default port)
  'http://localhost:5174',  // Alternative frontend port
  'https://movie-007-booking.netlify.app'
];

// Apply CORS middleware with specific options
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Check if the request origin is in the allowed origins
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  }
  
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enhanced static file serving
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, path) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
  }
}));

// Test route for static files
app.get('/test-upload', (req, res) => {
  res.send('Static files are being served correctly');
});

// ROUTES
app.use("/api/auth", userRouter);
app.use("/api/movies", movieRouter);
app.use("/api/bookings", bookingRouter);

app.get("/", (req, res) => {
  res.send(`
    <h1>API is running</h1>
    <p>Test static files: <a href="/test-upload">Test Uploads</a></p>
  `);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Initialize Database and Cloudinary
const initializeApp = async () => {
  try {
    // Create uploads directory if it doesn't exist
    const fs = await import('fs');
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
      console.log('Uploads directory created');
    }

    // Connect to MongoDB
    await connectDB();
    
    // Initialize Cloudinary
    await initCloudinary();
    console.log('Cloudinary initialized successfully');
    
    // Start the server
    app.listen(port, () => {
      console.log(`Server Started on http://localhost:${port}`);
      console.log(`Serving static files from: ${uploadsPath}`);
    });
  } catch (error) {
    console.error('Failed to initialize the application:', error);
    process.exit(1);
  }
};

// Start the application
initializeApp();
