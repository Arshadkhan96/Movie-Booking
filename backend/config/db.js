import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://arshadking7163_db_user:moviebook1234@cluster0.ime766b.mongodb.net/MovieBook?retryWrites=true&w=majority&appName=Cluster0"
    );

    console.log("DB CONNECTED");
  } catch (error) {
    console.error("DB CONNECTION FAILED:", error.message);
  }
};
