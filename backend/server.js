import express from "express"
import cors from "cors"
import dotenv from "dotenv/config"
import { connectDB } from "./config/db.js";
import userRouter from "./routes/userRoute.js";
import movieRouter from "./routes/movieRoute.js";
import path from "path";
import bookingRouter from "./routes/bookingRoute.js";
import { initCloudinary } from "./config/cloudinary.js";

const app = express();
const port = 5000;

// MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Database and Cloudinary
const initializeApp = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Initialize Cloudinary
    await initCloudinary();
    console.log('Cloudinary initialized successfully');
    
    // Start the server
    app.listen(port, () => {
      console.log(`Server Started on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize the application:', error);
    process.exit(1);
  }
};

// ROUTES
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use("/api/auth", userRouter);
app.use("/api/movies", movieRouter);
app.use("/api/bookings", bookingRouter);

app.get("/", (req, res) => {
  res.send(`API WORKS`);
});

// Start the application
initializeApp();
