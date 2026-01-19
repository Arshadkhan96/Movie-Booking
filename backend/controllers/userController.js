import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = "your_jwt_secret_key";
const TOKEN_EXPIRES_IN = "24h";

const emailIsValid = (e) => /\S+@\S+\.\S+/.test(String(e || ""));
const extractCleanPhone = (p) => String(p || "").replace(/\D/g, "");
const mkToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

/* ---------------- REGISTER USER ---------------- */
export const registerUser = async (req, res) => {
  try {
    const { fullName, userName, email, phone, birthDate, password } = req.body || {};

    if (!fullName || !userName || !email || !phone || !birthDate || !password) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (typeof fullName !== "string" || fullName.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Full name must be at least 2 characters long." });
    }

    if (typeof userName !== "string" || userName.trim().length < 3) {
      return res.status(400).json({ success: false, message: "Username must be at least 3 characters long." });
    }

    if (!emailIsValid(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format." });
    }

    const cleanPhone = extractCleanPhone(phone);
    if (cleanPhone.length < 6) {
      return res.status(400).json({ success: false, message: "Phone number seems invalid." });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
    }

    const parsedBirth = new Date(birthDate);
    if (Number.isNaN(parsedBirth.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid birth date." });
    }

    const existingByEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingByEmail) {
      return res.status(400).json({ success: false, message: "Email already exists." });
    }

    const existingByUserName = await User.findOne({ userName: userName.trim() });
    if (existingByUserName) {
      return res.status(400).json({ success: false, message: "Username already exists." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save user
    const newUser = await User.create({
      fullName: fullName.trim(),
      userName: userName.trim(),
      email: email.toLowerCase().trim(),
      phone: cleanPhone,
      birthDate: parsedBirth,
      password: hashedPassword,
    });

    const token = mkToken({ userId: newUser._id.toString() });

    return res.status(201).json({
      success: true,
      message: "User registered successfully!",
      user: {
        _id: newUser._id,
        fullName: newUser.fullName,
        userName: newUser.userName,
        email: newUser.email,
        phone: newUser.phone,
        birthDate: newUser.birthDate,
      },
      token,
    });
  } catch (err) {
    console.error("REGISTER USER ERROR:", err);

    if (err.code === 11000) {
      const dupKey = Object.keys(err.keyValue || {})[0];
      return res.status(400).json({
        success: false,
        message: `${dupKey} already exists.`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server Error. Please try again later.",
    });
  }
};

/* ---------------- LOGIN USER ---------------- */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = mkToken({ userId: user._id.toString() });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        userName: user.userName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error. Please try again later.",
    });
  }
};

/* ---------------- GET ALL USERS ---------------- */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
