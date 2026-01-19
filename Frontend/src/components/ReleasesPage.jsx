import { useEffect, useState } from "react";
import { releasesStyles } from "../assets/dummyStyles";

const PLACEHOLDER_IMG = "https://via.placeholder.com/400x600?text=No+Image";
const API_BASE = 'http://localhost:5000';

//to get img from uploads folder
const getUploadUrl = (maybeFilenameOrUrl) => {
  if (!maybeFilenameOrUrl) return null;
  if (typeof maybeFilenameOrUrl !== "string") return null;
  if (
    maybeFilenameOrUrl.startsWith("http://") ||
    maybeFilenameOrUrl.startsWith("https://")
  )
    return maybeFilenameOrUrl;
  // assume it's a filename saved by multer
  return `${API_BASE}/uploads/${maybeFilenameOrUrl.replace(/^uploads\//, "")}`;
};

//map our movies coming from the server side..
const mapBackendMovieToUi = (m) => {
  // backend returns poster (full URL or filename) and also latestTrailer.thumbnail etc.
  const poster =
    m.poster || (m.latestTrailer && m.latestTrailer.thumbnail) || null;
  const image = getUploadUrl(poster) || PLACEHOLDER_IMG;

  // display a category string (pick categories array or latestTrailer.genres)
  const category =
    (Array.isArray(m.categories) && m.categories.join(", ")) ||
    (m.latestTrailer &&
      Array.isArray(m.latestTrailer.genres) &&
      m.latestTrailer.genres.join(", ")) ||
    "";

  return {
    id: m._id || m.id,
    title:
      m.movieName ||
      m.title ||
      (m.latestTrailer && m.latestTrailer.title) ||
      "Untitled",
    image,
    category,
    raw: m,
  };
};



const ReleasesPage = () => {
    const [movies, setMovies ] = useState([])
    const [ loading,setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(()=>{
        let cancelled = false;
        async function load(){
            setLoading(true);
            setError(null);
            try {
                const url = `${API_BASE}/api/movies?latestTrailers=true&limit=100`; 
                const res = await fetch(url);
                if(!res.ok) throw new Error(`HTTP${res.status}`);
                const json = await res.json();
                
                
                const items = Array.isArray(json.items)
                ?json.items
                :Array.isArray(json.data)
                ?json.data
                :[];

                const mapped = (items ||[]).map(mapBackendMovieToUi);

                if(!cancelled) setMovies(mapped)
            } catch (error) {
                console.error('failed to load',error);
                if(!cancelled)setError('fail to load releases');
            }finally{
                if(!cancelled) setLoading(false);
            }
        }
        load();

        return ()=>{
            cancelled = true
        }
    },[])

  return (
    <div className={releasesStyles.pageContainer}>
        <div className={releasesStyles.headerContainer}>
            <h1 className={releasesStyles.headerTitle}>RELEASE SOON</h1>
            <p className={releasesStyles.headerSubtitle}>
                Latest Movies •  Now Showing
            </p>
        </div>

        <div className={releasesStyles.movieGrid}>
            {movies.map(movie =>(
                <div key={movie.id} className={releasesStyles.movieCard}>
                    <div className={releasesStyles.imageContainer}>
                        <img src={movie.image} 
                        alt={movie.title} 
                        className={releasesStyles.movieImage}/>
                    </div>

                    <div className={releasesStyles.movieInfo}>
                        <h3 className={releasesStyles.movieTitle}>{movie.title}</h3>
                        <p className={releasesStyles.movieCategory}>{movie.category}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
  )
}

export default ReleasesPage

