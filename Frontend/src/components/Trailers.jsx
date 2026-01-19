import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Clock,
  Play,
  X,
} from "lucide-react";
import { trailersStyles, trailersCSS } from "../assets/dummyStyles";
import { useEffect, useRef, useState } from "react";
import axios  from "axios"

const API_BASE = "http://localhost:5000";


const PLACEHOLDER_THUMB =
  "https://via.placeholder.com/800x450?text=No+Thumbnail";

const getUploadUrl = (input) => {
  if (!input) return null;

  // Case 1: already a full URL
  if (typeof input === "string") {
    if (input.startsWith("http://") || input.startsWith("https://"))
      return input;
    // filename only (like "abc.jpg")
    return `${API_BASE}/uploads/${input}`;
  }

  // Case 2: input is an object (multer-like)
  if (typeof input === "object") {
    const possible =
      input.url ||
      input.path ||
      input.filename ||
      input.file ||
      input.image ||
      "";

    if (possible) return getUploadUrl(possible);
  }

  return null;
};

//for duration
const formatDuration = (dur) => {
  if (!dur) return "";
  if (typeof dur === "string") return dur;
  if (typeof dur === "number") return `${dur}m`;
  // object with hours/minutes
  const h = dur.hours ?? 0;
  const m = dur.minutes ?? 0;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  if (m) return `${m}m`;
  return "";
};

const mapMovieToTrailerItem = (movie) => {
  // movie.latestTrailer may hold nested data
  const lt = movie.latestTrailer || {};
  const title = lt.title || movie.movieName || movie.title || "Untitled";
  const thumbnail =
    getUploadUrl(lt.thumbnail) ||
    getUploadUrl(movie.poster) ||
    PLACEHOLDER_THUMB;
  const videoUrl =
    lt.videoId || lt.videoUrl || movie.trailerUrl || movie.videoUrl || "";
  const duration = lt.duration
    ? formatDuration(lt.duration)
    : movie.duration
    ? formatDuration(movie.duration)
    : "";
  const year = lt.year || movie.year || "";
  const genre =
    lt.genres && lt.genres.length
      ? lt.genres.join(", ")
      : movie.categories && movie.categories.length
      ? movie.categories.join(", ")
      : "";
  const description = lt.description || movie.story || "";

  // Build credits object expected by UI: { Director: { name, image }, Producer: {...}, Singer: {...} }
  const credits = {};
  const firstDirector = (lt.directors || movie.directors || []).find(Boolean);
  const firstProducer = (lt.producers || movie.producers || []).find(Boolean);
  const firstSinger = (lt.singers || movie.singers || []).find(Boolean);

  //if the pic not persent then ok else it wll show the placeholder thumbnail
  if (firstDirector) {
    credits["Director"] = {
      name: firstDirector.name || "Unknown",
      image:
        getUploadUrl(firstDirector.file) ||
        getUploadUrl(firstDirector.image) ||
        getUploadUrl(firstDirector.photo) ||
        PLACEHOLDER_THUMB,
    };
  }
  if (firstProducer) {
    credits["Producer"] = {
      name: firstProducer.name || "Unknown",
      image:
        getUploadUrl(firstProducer.file) ||
        getUploadUrl(firstProducer.image) ||
        getUploadUrl(firstProducer.photo) ||
        PLACEHOLDER_THUMB,
    };
  }
  if (firstSinger) {
    credits["Singer"] = {
      name: firstSinger.name || "Unknown",
      image:
        getUploadUrl(firstSinger.file) ||
        getUploadUrl(firstSinger.image) ||
        getUploadUrl(firstSinger.photo) ||
        PLACEHOLDER_THUMB,
    };
  }

  return {
    id: movie._id || movie.id,
    title,
    thumbnail,
    videoUrl,
    duration,
    year,
    genre,
    description,
    credits,
  };
};



const Trailers = () => {
  const [featuredTrailer, setFeaturedTrailer] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);
  const carouselRef = useRef(null);
  const [trailers, setTrailers]= useState([])
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(()=>{
    const ac = new AbortController();
    setLoading(true);
    setError(null)

    async function load(){
      try {
        const url = `${API_BASE}/api/movies?type=latestTrailers&limit=50`;
         const res = await fetch(url, {signal:ac.signal});
            if(!res.ok) throw new Error(`HTTP${res.status}`);
           const json = await res.json();
           const items = Array.isArray(json.items) ? json.items : [];

           const mapped = items.map(mapMovieToTrailerItem)
           console.log(mapped);
           setTrailers(mapped)
           setFeaturedTrailer(mapped[0]|| null);
           setLoading(false)
      } catch (err) {
        if(err.name === 'AbortError') return;
        console.error('Failed to load trailers:',err)
        setError('Failed to load from server')
        setLoading(false)
      }
    }
    load();
    return ()=>ac.abort();
  },[])


  // setup (no-op)
  useEffect(() => {
    const handleScroll = () => {};
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // carousel scroll
  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -280, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 280, behavior: "smooth" });
    }
  };

  // select trailer
  const selectTrailer = (trailer) => {
    setFeaturedTrailer(trailer);
    setIsPlaying(false);
    try {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    } catch (e) {
      console.warn(e);
    }

    // center selected in carousel
    try {
      if (carouselRef.current) {
        const el = carouselRef.current.querySelector(`[data-id='${trailer.id}']`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const parentRect = carouselRef.current.getBoundingClientRect();
          const offset =
            rect.left - parentRect.left - parentRect.width / 2 + rect.width / 2;
          carouselRef.current.scrollBy({ left: offset, behavior: "smooth" });
        }
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const togglePlay = () => setIsPlaying((s) => !s);

  // ✅ FIXED FUNCTION: build proper embed URL for YouTube/Vimeo
  const getEmbedBaseUrl = (videoUrl) => {
    if (!videoUrl) return "";

    // Handle YouTube normal links
    if (videoUrl.includes("youtube.com/watch?v=")) {
      const videoId = new URL(videoUrl).searchParams.get("v");
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // Handle youtu.be short links
    if (videoUrl.includes("youtu.be/")) {
      const videoId = videoUrl.split("youtu.be/")[1].split(/[?&]/)[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // Handle Vimeo links
    if (videoUrl.includes("vimeo.com/")) {
      const videoId = videoUrl.split("vimeo.com/")[1].split(/[?&]/)[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }

    // fallback (if already an embed URL)
    return videoUrl;
  };

  // build final iframe src
  const buildIframeSrc = (videoUrl) => {
    const base = getEmbedBaseUrl(videoUrl);
    if (!base) return "";
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}autoplay=1&mute=${isMuted ? 1 : 0}&rel=0`;
  };

  if(loading){
    return(
    <div className={trailersStyles.container}>
      <div className="py-12 text-center text-gray-300">Loading Trailers...</div>
    </div>
    )
  }

  if(error){
    return(
      <div className={trailersStyles.container}>
        <div className="py-12 text-center text-red-400">{error}</div>
      </div>
    );
  }
  const dataToRender = trailers || []; 
  return (
    <div className={trailersStyles.container}>
      <main className={trailersStyles.main}>
        <div className={trailersStyles.layout}>
          {/* Left Side */}
          <div className={trailersStyles.leftSide}>
            <div className={trailersStyles.leftCard}>
              <h2
                className={trailersStyles.leftTitle}
                style={{ fontFamily: "Monoton, cursive" }}
              >
                <Clapperboard className={trailersStyles.titleIcon} />
                Latest Trailers
              </h2>

              <div className={trailersStyles.carouselControls}>
                <div className={trailersStyles.controlButton}>
                  <button onClick={scrollLeft} className={trailersStyles.controlButton}>
                    <ChevronLeft size={18} />
                  </button>

                  <button onClick={scrollRight} className={trailersStyles.controlButton}>
                    <ChevronRight size={18} />
                  </button>
                </div>
                <span className={trailersStyles.trailerCount}>
                  {dataToRender.length} trailers
                </span>
              </div>

              <div
                ref={carouselRef}
                className={trailersStyles.carousel}
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {dataToRender.map((trailer) => (
                  <div
                    key={trailer.id}
                    data-id={trailer.id}
                    className={`${trailersStyles.carouselItem.base} ${
                      featuredTrailer.id === trailer.id
                        ? trailersStyles.carouselItem.active
                        : trailersStyles.carouselItem.inactive
                    }`}
                    style={{
                      width: "220px",
                      height: "124px",
                      minWidth: "220px",
                    }}
                    onClick={() => selectTrailer(trailer)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") selectTrailer(trailer);
                    }}
                    aria-pressed={featuredTrailer.id === trailer.id}
                  >
                    <img
                      src={trailer.thumbnail}
                      alt={trailer.title}
                      className={trailersStyles.carouselImage}
                      loading="lazy"
                    />
                    <div className={trailersStyles.carouselOverlay}>
                      <h3 className={trailersStyles.carouselTitle}>
                        {trailer.title}
                      </h3>
                      <p className={trailersStyles.carouselGenre}>{trailer.genre}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trending Section */}
              <div className={trailersStyles.trendingSection}>
                <h3 className={trailersStyles.trendingTitle}>Now Trending</h3>
                {dataToRender.slice(0, 3).map((trailer) => (
                  <div
                    key={trailer.id}
                    onClick={() => selectTrailer(trailer)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") selectTrailer(trailer);
                    }}
                    className={trailersStyles.trendingItem}
                  >
                    <div className={trailersStyles.trendingImage}>
                      <img
                        src={trailer.thumbnail || PLACEHOLDER_THUMB}
                        alt={trailer.title}
                        className={trailersStyles.trendingImageSrc}
                        loading="lazy"
                      />
                    </div>
                    <div className={trailersStyles.trendingContent}>
                      <h4 className={trailersStyles.trendingItemTitle}>
                        {trailer.title}
                      </h4>
                      <p className={trailersStyles.trendingItemGenre}>
                        {trailer.genre}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className={trailersStyles.rightSide}>
            <div className={trailersStyles.rightCard}>
              <div className={trailersStyles.videoContainer}>
                {isPlaying ? (
                  <div className={trailersStyles.videoWrapper}>
                    <iframe
                      className={trailersStyles.videoIframe}
                      src={buildIframeSrc(featuredTrailer.videoUrl)}
                      title={featuredTrailer.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      ref={videoRef}
                    />
                    <div className={trailersStyles.closeButton}>
                      <button
                        title="Close"
                        onClick={() => setIsPlaying(false)}
                        className={trailersStyles.closeButton}
                      >
                        <X size={28} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={trailersStyles.thumbnailContainer}>
                    <img
                      src={featuredTrailer.thumbnail}
                      alt={featuredTrailer.title}
                      className={trailersStyles.thumbnailImage}
                      loading="eager"
                    />
                    <div className={trailersStyles.playButtonContainer}>
                      <button onClick={togglePlay} className={trailersStyles.playButton}>
                        <Play size={32} fill="white" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Trailer Info */}
              <div className={trailersStyles.trailerInfo}>
                <div className={trailersStyles.infoHeader}>
                  <h2 className={trailersStyles.trailerTitle}>
                    {featuredTrailer.title}
                  </h2>
                  <div className={trailersStyles.trailerMeta}>
                    <span className={trailersStyles.metaItem}>
                      <Clock size={16} className={trailersStyles.metaIcon} />
                      {featuredTrailer.duration}
                    </span>
                    <span className={trailersStyles.metaItem}>
                      <Calendar size={16} className={trailersStyles.metaIcon} />
                      {featuredTrailer.year}
                    </span>
                  </div>
                </div>

                <div className={trailersStyles.genreContainer}>
                  {featuredTrailer.genre
                    .split(",")
                    .map((genre, index) => (
                      <span key={index} className={trailersStyles.genreTag}>
                        {genre.trim()}
                      </span>
                    ))}
                </div>

                <p className={trailersStyles.description}>
                  {featuredTrailer.description}
                </p>

                {/* Credits */}
                <div className={trailersStyles.credits}>
                  <h3 className={trailersStyles.creditsTitle}>Credits</h3>
                  <div className={trailersStyles.creditsGrid}>
                    {featuredTrailer.credits &&
                      Object.entries(featuredTrailer.credits).map(
                        ([role, person]) => (
                          <div key={role} className={trailersStyles.creditItem}>
                            <div className={trailersStyles.creditImage}>
                              <img
                                src={person.image}
                                alt={person.name}
                                className={trailersStyles.creditImageSrc}
                                loading="lazy"
                              />
                            </div>
                            <div className={trailersStyles.creditName}>
                              {person.name}
                            </div>
                            <div className={trailersStyles.creditRole}>{role}</div>
                          </div>
                        )
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <style jsx>{trailersCSS}</style>
    </div>
  );
};

export default Trailers;
