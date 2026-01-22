import { Link } from "react-router-dom";
import { moviesStyles } from "../assets/dummyStyles";
import { Tickets } from "lucide-react";
import { useEffect, useState } from "react";

const API_BASE = "https://movie-booking-0z6f.onrender.com";
const PLACEHOLDER =
  "https://dummyimage.com/400x600/cccccc/000000&text=No+Poster";

const getUploadUrl = (maybe) => {
  if (!maybe) return PLACEHOLDER;
  if (typeof maybe !== "string") return PLACEHOLDER;
  
  // If it's already a full URL, return as is
  if (maybe.startsWith("http")) return maybe;
  
  // If it's a Cloudinary public_id (starts with 'image/upload/')
  if (maybe.startsWith("image/upload/")) {
    return `https://res.cloudinary.com/YOUR_CLOUD_NAME/${maybe}`;
  }
  
  // Handle absolute paths (starting with /uploads/)
  if (maybe.startsWith("/uploads/")) {
    return `https://movie-booking-0z6f.onrender.com${maybe}`;
  }
  
  // Handle relative paths (uploads/filename.jpg)
  if (maybe.startsWith("uploads/")) {
    return `https://movie-booking-0z6f.onrender.com/uploads/${maybe.replace(/^uploads\//, "")}`;
  }
  
  // Default case - assume it's just a filename
  return `https://movie-booking-0z6f.onrender.com/uploads/${maybe}`;
};

const Movies = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ac = new AbortController();

    const loadFeaturedMovies = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${API_BASE}/api/movies?featured=true&limit=100`,
          { signal: ac.signal }
        );

        if (!res.ok) {
          throw new Error(`Fetch error: ${res.status}`);
        }

        const json = await res.json();
        const items = json.items ?? json ?? [];

        const featuredOnly = items.filter(
          (m) =>
            m.featured === true ||
            m.isFeatured === true ||
            String(m.type).toLowerCase() === "featured"
        );

        setMovies(featuredOnly.slice(0, 6));
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Movies load error:", err);
        setError("Failed to load movies");
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedMovies();
    return () => ac.abort();
  }, []);

  return (
    <section className={moviesStyles.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Pacifico&display=swap');
      `}</style>

      <h2
        className={moviesStyles.title}
        style={{ fontFamily: "'Dancing Script', cursive" }}
      >
        Featured Movies
      </h2>

      {/* STATES */}
      {loading && (
        <div className="text-gray-300 py-12 text-center">
          Loading movies...
        </div>
      )}

      {error && (
        <div className="text-red-400 py-12 text-center">
          {error}
        </div>
      )}

      {!loading && !error && movies.length === 0 && (
        <div className="text-gray-400 py-12 text-center">
          No featured movies found.
        </div>
      )}

      {/* MOVIE GRID */}
      {!loading && !error && movies.length > 0 && (
        <div className={moviesStyles.grid}>
          {movies.map((m) => {
            const movieId = m._id || m.id;
            const title = m.movieName || m.title || "Untitled";
            const category =
              (Array.isArray(m.categories) && m.categories[0]) ||
              m.category ||
              "General";

            const imgSrc = getUploadUrl(
              m.poster || m.thumbnail || m.img
            );

            return (
              <article
                key={movieId}
                className={moviesStyles.movieArticle}
              >
                <Link
                  to={`/movie/${movieId}`}
                  className={moviesStyles.movieLink}
                >
                  <img
                    src={imgSrc}
                    alt={title}
                    loading="lazy"
                    className={moviesStyles.movieImage}
                    onError={(e) => {
                      e.currentTarget.src = PLACEHOLDER;
                    }}
                  />
                </Link>

                <div className={moviesStyles.movieInfo}>
                  <div className={moviesStyles.titleContainer}>
                    <Tickets className={moviesStyles.ticketsIcon} />
                    <span
                      id={`movie-title-${movieId}`}
                      className={moviesStyles.movieTitle}
                      style={{ fontFamily: "'Pacifico', cursive" }}
                    >
                      {title}
                    </span>
                  </div>

                  <div className={moviesStyles.categoryContainer}>
                    <span className={moviesStyles.categoryText}>
                      {category}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default Movies;
