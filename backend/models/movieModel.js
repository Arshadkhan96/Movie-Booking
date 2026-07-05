import mongoose from "mongoose";

const personSchema = new mongoose.Schema({
   name: { type: String, trim: true, default: "" },
    role: { type: String, trim: true, default: "" }, //used for cast and crew roles
    file: { type: String, trim: true, default: null }, //for url
},{
    _id: false
});

const slotSchema = new mongoose.Schema({
    date: { type: String, default: "" },
    time: { type: String, default: "" },
    ampm: { type: String, enum: ["AM", "PM"], default: "AM" },
},{
    _id: false
});

const latestTrailerSchema = new mongoose.Schema({
    title: { type: String, trim: true },
    genres: [{ type: String }],
    duration: {
      hours: { type: Number, default: 0 },
      minutes: { type: Number, default: 0 },
    },
    year: { type: Number },
    rating: { type: Number, default: 0 },
    description: { type: String, trim: true },
    thumbnail: { type: String, trim: true }, //file name or url
    videoId: { type: String, trim: true }, //storing the url

    directors: [personSchema],
    producers: [personSchema],
    singers: [personSchema],
},{
    _id: false
});

const movieSchema = new mongoose.Schema({
    type: {
      type: String,
      enum: ["normal", "featured", "releaseSoon", "latestTrailers"],
      default: "normal",
    },

    movieName: { type: String, trim: true },
    categories: [{ type: String }],
    poster: { type: String, trim: true }, //url file name
    trailerUrl: { type: String, trim: true },
    videoUrl: { type: String, trim: true },
    rating: { type: Number, default: 0 },
    duration: { type: Number, default: 0 }, //total duration in minutes
    //for pricing
    slots: [slotSchema],
    seatPrices: {
      standard: { type: Number, default: 0 },
      recliner: { type: Number, default: 0 },
    },
    auditorium: { type: String, trim: true, default: "Audi 1" }, //audi selection
    // people details
    cast: [personSchema],
    directors: [personSchema],
    producers: [personSchema],

    story: { type: String, trim: true },
    latestTrailer: latestTrailerSchema,
},{
    timestamps: true,
});

const movie = mongoose.models.Movie || mongoose.model("Movie", movieSchema);
export default movie;
