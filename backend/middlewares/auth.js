import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const JWT_SECRET = "your_jwt_secret_key";

export default async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Authorization header missing or malformed." });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    try{
        const payload = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(payload.userId).select("-password");
        if(!user) {
            return res.status(401).json({ success: false, message: "User not found." });
        }
        req.user = user;
        next();
    }

    catch(err) {
        console.error("AUTH MIDDLEWARE ERROR:", err);
        return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }
}