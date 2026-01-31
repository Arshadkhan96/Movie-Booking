import express from "express";
import cors from "cors";
import dotenv from "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./config/db.js";
import { initCloudinary } from "./config/cloudinary.js";

import userRouter from "./routes/userRoute.js";
import movieRouter from "./routes/movieRoute.js";
import bookingRouter from "./routes/bookingRoute.js";

// ES module __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

/* =======================
   CORS CONFIG (FIXED)
======================= */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://movie-admin-panel.netlify.app",
  "https://cine-ticket-hub.netlify.app",
  "https://movie-booking-0z6f.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, mobile apps)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* =======================
   BODY PARSER
======================= */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* =======================
   STATIC FILES
======================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =======================
   ROUTES
======================= */
app.use("/api/auth", userRouter);
app.use("/api/movies", movieRouter);
app.use("/api/bookings", bookingRouter);

/* =======================
   TEST ROUTE
======================= */
app.get("/", (req, res) => {
  res.send("<h1>🚀 Movie Booking API is Running</h1>");
});

/* =======================
   ERROR HANDLER
======================= */
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({
    success: false,
    message: err.message || "Server Error",
  });
});

/* =======================
   START SERVER
======================= */
const startServer = async () => {
  try {
    await connectDB();
    await initCloudinary();

    console.log("✅ MongoDB Connected");
    console.log("✅ Cloudinary Initialized");

    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  } catch (error) {
    console.error("❌ Server start failed:", error);
    process.exit(1);
  }
};

startServer();
