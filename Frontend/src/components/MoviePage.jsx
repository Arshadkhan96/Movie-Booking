import { useEffect, useState, useMemo} from "react"
import { moviesPageStyles } from "../assets/dummyStyles"
import { Link } from "react-router-dom"


const API_BASE = import.meta.env.VITE_API_URL || 'https://movie-booking-0z6f.onrender.com';
const COLLAPSE_COUNT = 12;
const PLACEHOLDER = "https://dummyimage.com/400x600/cccccc/000000&text=No+Poster";

const getUploadUrl = (maybe) => {
  if (!maybe) return PLACEHOLDER;
  if (typeof maybe !== "string") return PLACEHOLDER;
  
  // If it's already a full URL, return as is
  if (maybe.startsWith("http")) return maybe;
  
  // If it's a Cloudinary public_id (starts with 'image/upload/')
  if (maybe.startsWith("image/upload/")) {
    const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'YOUR_CLOUD_NAME';
    return `https://res.cloudinary.com/${cloudName}/${maybe}`;
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

const categoriesList = [
  { id: "all", name: "All Movies" },
  { id: "action", name: "Action" },
  { id: "horror", name: "Horror" },
  { id: "comedy", name: "Comedy" },
  { id: "adventure", name: "Adventure" },
];

const mapBackendMovie = (m) => {
  const id = m._id || m.id || "";
  const title = m.movieName || m.title || "Untitled";
  const rawImg = m.poster || m.latestTrailer?.thumbnail || m.thumbnail || null;
  const image = getUploadUrl(rawImg) || PLACEHOLDER;

  // pick first category (normalize to lowercase for category id comparisons)
  const cat =
    (Array.isArray(m.categories) && m.categories[0]) ||
    m.category ||
    (Array.isArray(m.latestTrailer?.genres) && m.latestTrailer.genres[0]) ||
    "General";

  const category = String(cat || "General");

  return { id, title, image, category, raw: m };
};



const MoviePage = () => {

    const [activeCategory, setActiveCategory] = useState('all')
    const [showAll, setShowAll] = useState(false);
    const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(()=>{
    const ac = new AbortController();
    let mounted = true;

    async function load(){
        setLoading(true);
        setError(null)

        try {
            const url = `${API_BASE}/api/movies?type=normal&limit=200`;
            const res = await fetch(url, {signal:ac.signal});
            if(!res.ok) throw new Error(`HTTP${res.status}`);

            const json = await res.json();
            const items = Array.isArray(json.items) ? json.items : [];

            const mapped = items.map(mapBackendMovie);
            if(mounted){
                setMovies(mapped);
                setLoading(false)
            }
        } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Failed to load movies:", err);
        // fallback: try a generic fetch for any movies
        try {
          const res2 = await fetch(`${API_BASE}/api/movies?limit=200`);
          if (!res2.ok) throw new Error(`Fallback HTTP ${res2.status}`);
          const json2 = await res2.json();
          const items2 = Array.isArray(json2.items) ? json2.items : [];
          const mapped2 = items2.map(mapBackendMovie);
          if (mounted) {
            setMovies(mapped2);
            setLoading(false);
          }
        } catch (err2) {
          if (err2.name === "AbortError") return;
          console.error("Movies fallback failed:", err2);
          if (mounted) {
            setError("Unable to load movies.");
            setLoading(false);
          }
        }
      }
    }
load();
  return () =>{
    mounted = false;
    ac.abort();
  }
},[]);

const filteredMovies = useMemo(()=>{
    if(activeCategory === "all") return movies;
    return movies.filter(
        (m)=> 
            String(m.category || "").toLocaleLowerCase() ===
           String(activeCategory || "").toLocaleLowerCase()
    );
},[movies, activeCategory])
  
   const visibleMovies = showAll ? filteredMovies : filteredMovies.slice(0, COLLAPSE_COUNT);
  

  useEffect(()=>{
    setShowAll(false)
  },[activeCategory])



  return (
    <div className={moviesPageStyles.container}>

        <section className={moviesPageStyles.categoriesSection}>
            <div className={moviesPageStyles.categoriesContainer}>
                <div className={moviesPageStyles.categoriesFlex}>
                    {categoriesList.map(category =>(
                        <button key={category.id}
                        className={`${moviesPageStyles.categoryButton.base} ${activeCategory === category.id ?
                            moviesPageStyles.categoryButton.active: moviesPageStyles.categoryButton.inactive
                        }`} onClick={()=> setActiveCategory(category.id)}>
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>
        </section>

        <section className={moviesPageStyles.moviesSection}>
            <div className={moviesPageStyles.moviesContainer}>

                {loading ? (
                    <div className="py-12 text-gray-300 text-center">Loading movies...</div>
                ): error?(
                   <div className="py-12 text-center text-red-500">{error}</div>     
                ):(
                    <>
                     <div className={moviesPageStyles.moviesGrid}>
                {visibleMovies.map(movie =>(
                    <Link 
                    key={movie.id} 
                    to={`/movies/${movie.id}`} 
                    state={{movie}} 
                    className={moviesPageStyles.movieCard}>
                    <div className={moviesPageStyles.movieImageContainer}>
                        <img src={movie.image} alt={movie.title}
                        className={moviesPageStyles.movieImage}
                        />
                    </div>

                    <div className={moviesPageStyles.movieInfo}>
                        <h3 className={moviesPageStyles.movieTitle}>{movie.title}</h3>
                        <div className={moviesPageStyles.movieCategory}>
                            <span className={moviesPageStyles.movieCategoryText}>
                                {moviesPageStyles.movieCategory}
                            </span>
                        </div>
                    </div>
                    </Link>
                ))}
                
                {filteredMovies.length === 0 &&(
                    <div className={moviesPageStyles.emptyState}>
                        No movies found in this category.
                    </div>
                )}
            </div>
                    </>
                )}
           

            {filteredMovies.length > COLLAPSE_COUNT &&(
                <div className={moviesPageStyles.showMoreContainer}>
                    <button
                    onClick={()=> setShowAll((prev)=>!prev)}
                    className={moviesPageStyles.showMoreButton}
                    type="button"
                    >
                        {
                            showAll ? "Show Less":`Show More (${
                                filteredMovies.length - COLLAPSE_COUNT
                            } more)`
                        }
                    </button>
                </div>
            )}
            </div>        
        </section>
      
    </div>
  )
}

export default MoviePage
