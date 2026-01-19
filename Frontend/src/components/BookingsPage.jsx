import { bookingsPageStyles, formatDuration , formatTime} from "../assets/dummyStyles";
import QRCode from "qrcode"
import axios from "axios"
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Clock ,  Film, MapPin, QrCode,ChevronDown } from "lucide-react"

const  API_BASE = "http://localhost:5000"

function getStoreToken() {
  return(
    localStorage.getItem("token") ||
    localStorage.getItem("authToken")||
    localStorage.getItem("accessToken")||
    null
  )
}
const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [qrs, setQrs] = useState({});
  const [expanded, setExpanded] = useState({});
  const [scannedDetails, setScannedDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function computeTotals(booking) {
    // First, get the seat count
    const seats = Array.isArray(booking.seats) ? booking.seats : [];
    const seatCount = seats.length > 0 ? seats.length : 1;

    // Priority 1: amountPaise on top-level or raw
    if (booking.amountPaise !== undefined && booking.amountPaise !== null) {
      const amt = Number(booking.amountPaise) / 100;
      return {
        subtotal: amt / Math.max(seatCount, 1), // Calculate per-seat price
        total: amt,
        seatCount: seatCount,
      };
    }
    if (
      booking.raw &&
      booking.raw.amountPaise !== undefined &&
      booking.raw.amountPaise !== null
    ) {
      const amt = Number(booking.raw.amountPaise) / 100;
      return {
        subtotal: amt / Math.max(seatCount, 1), // Calculate per-seat price
        total: amt,
        seatCount: seatCount,
      };
    }

    // Priority 2: numeric amount (rupees) if provided
    if (typeof booking.amount === "number" && booking.amount > 0) {
      return {
        subtotal: booking.amount / Math.max(seatCount, 1), // Calculate per-seat price
        total: booking.amount,
        seatCount: seatCount,
      };
    }
    if (
      booking.raw &&
      typeof booking.raw.amount === "number" &&
      booking.raw.amount > 0
    ) {
      return {
        subtotal: booking.raw.amount / Math.max(seatCount, 1), // Calculate per-seat price
        total: booking.raw.amount,
        seatCount: seatCount,
      };
    }

    // Fallback: sum per-seat prices (if seat objects have .price)
    const subtotal = seats.reduce((s, seat) => {
      if (!seat) return s;
      if (typeof seat === "object" && typeof seat.price === "number")
        return s + seat.price;
      // fallback: assume seat is string -> cannot compute -> 0
      return s;
    }, 0);

    return {
      subtotal: subtotal > 0 ? subtotal / Math.max(seatCount, 1) : 0,
      total: subtotal > 0 ? subtotal : 0,
      seatCount: seatCount
    };
  }

  //fetch function
  useEffect(() => {
    let mounted = true;
    async function fetchMyBookings() {
      setLoading(true);
      setError("");
      try {
        const token = getStoreToken();
        if (!token) {
          navigate("/login");
          return;
        }
        let res;
        try {
          console.log('Fetching user-specific bookings...');
          res = await axios.get(`${API_BASE}/api/bookings/my`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            timeout: 15000
          });
          console.log('User bookings response:', res);
        } catch (err) {
          console.warn("Could not fetch user-specific bookings, trying general endpoint:", err.message);
          try {
            console.log('Fetching all bookings...');
            res = await axios.get(`${API_BASE}/api/bookings`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              },
              timeout: 15000
            });
            console.log('All bookings response:', res);
          } catch (fallbackErr) {
            console.error("Error fetching all bookings:", fallbackErr);
            setError("Failed to load bookings. Please try again later.");
            setLoading(false);
            return;
          }
        }
        const data = res?.data || {};

        console.log('Raw API response data:', data);

        let items = [];
        if (Array.isArray(data)) {
          console.log('Data is an array, using directly');
          items = data;
        } else if (data && typeof data === 'object') {
          // Check all possible array properties
          const arrayProps = ['items', 'bookings', 'data', 'item'];
          for (const prop of arrayProps) {
            if (Array.isArray(data[prop])) {
              console.log(`Found array in property '${prop}'`);
              items = data[prop];
              break;
            }
          }

          // If no array found but has _id, use the object itself
          if (items.length === 0 && data._id) {
            console.log('No array found, but has _id, using as single item');
            items = [data];
          }
        }

        console.log('Processed items:', items);
        if (items.length === 0) {
          console.warn('No booking data found in response');
        }

        const normalized = items.map((b) => {
          const id = b._id || b.id || b.bookingId || String(b.id || "");
          const movie = b.movie || {};
          const title =
            movie.title || movie.name || b.movieName || b.title || "Untitled";
          const poster = movie.poster || b.poster || movie.image || "";
          const category = movie.category || b.category || "";
          const durationMins =
            movie.durationMins ?? movie.duration ?? b.durationMins ?? 0;
          const slotTime = b.showtime || b.slotTime || b.slot || null;
          const auditorium = b.auditorium || b.audi || "Audi 1";

          // seats: normalize string/object
          const seats =
            Array.isArray(b.seats) && b.seats.length
              ? b.seats.map((s) =>
                  typeof s === "string"
                    ? { id: s }
                    : {
                        id: s.seatId || s.id || s.name || "",
                        type: s.type,
                        price:
                          typeof s.price === "number" ? s.price : undefined,
                      }
                )
              : [];

          // top-level amount in rupees if present
          let amount = 0;
          if (b.amountPaise !== undefined && b.amountPaise !== null) {
            amount = Number(b.amountPaise) / 100;
          } else if (typeof b.amount === "number") {
            amount = b.amount;
          } else if (typeof b.total === "number") {
            amount = b.total;
          }

          return {
            id,
            title,
            poster,
            category,
            durationMins,
            slotTime,
            auditorium,
            seats,
            amount,
            amountPaise: b.amountPaise,
            raw: b,
          };
        });
        if (mounted) setBookings(normalized);
      } catch (err) {
        console.error("Failed to load bookings:", err);
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        if (mounted) {
          setError(
            err?.response?.data?.message ||
              err.message ||
              "Failed to load bookings"
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchMyBookings();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // generate QRs for current bookings
  useEffect(() => {
    let mounted = true;
    const makeQrs = async () => {
      const map = {};
      for (const b of bookings) {
        const seatsList = (b.seats || [])
          .map((s) => (typeof s === "string" ? s : s.id || ""))
          .filter(Boolean);
        const payload = JSON.stringify({
          bookingId: b.id,
          title: b.title,
          time: formatTime(b.slotTime),
          auditorium: b.auditorium,
          seats: seatsList,
        });
        try {
          const url = await QRCode.toDataURL(payload, {
            errorCorrectionLevel: "M",
            margin: 1,
            scale: 6,
          });
          map[b.id] = { url, payload };
        } catch (e) {
          console.error("QR error for", b.id, e);
          map[b.id] = { url: "", payload };
        }
      }
      if (mounted) setQrs(map);
    };
    if (bookings.length) makeQrs();
    return () => {
      mounted = false;
    };
  }, [bookings]);

  //to toggle
  const toggle = (id)=> setExpanded((prev)=> (
    {...prev, [id]: !prev[id]})
  ) 

  //to scan the QR and get the details
  const handleQrScan = (bookingId) => {
    const entry = qrs[bookingId];
    if (!entry || !entry.payload) return;
    try {
      const parsed = JSON.parse(entry.payload);
      setExpanded((prev) => ({ ...prev, [bookingId]: true }));
      const el = document.getElementById(`booking-card-${bookingId}`);
      if (el && el.scrollIntoView)
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      setScannedDetails({ bookingId, ...parsed });
    } catch (e) {
      console.error("Failed to parse QR payload", e);
    }
  };

  //close

  const closeModel = () => setScannedDetails(null);

    return (
    // <div className={bookingsPageStyles.pageContainer}>
    //   <div className={bookingsPageStyles.mainContainer}>
    //     <header className={bookingsPageStyles.header}>
    //       <h1 className={bookingsPageStyles.title} style={{color:'red'}}>Your Tickets</h1>
    //       <div className={bookingsPageStyles.subtital}>Present QR at entry</div>
    <div className={bookingsPageStyles.pageContainer}>
  <div className={bookingsPageStyles.mainContainer}>
    <header className={bookingsPageStyles.header}>
      <h1 className={bookingsPageStyles.title} style={{color:'red'}}>Your Tickets</h1>
      <div className={bookingsPageStyles.subtital}>Present QR at entry</div>
          </header>  

          { loading &&(
            <div className={bookingsPageStyles.loading}>Loading Bookings...</div>
          )}

          {!loading && error && (
            <div className={bookingsPageStyles.error}>{error}</div>
          )}

          <div className={bookingsPageStyles.grid}>
            {bookings.length ===0 && !length ? (
              <div className={bookingsPageStyles.noBookings}>No Bookings Found</div>
            ):(
              bookings.map((b)=>{
                const totals = computeTotals(b);
                const isOpen = !!expanded[b.id];

                return (
                <article
                  id={`booking-card-${b.id}`}
                  key={b.id}
                  className={bookingsPageStyles.bookingCard}
                  aria-labelledby={`booking-${b.id}-title`}
                >
                  <div className={bookingsPageStyles.cardContent}>
                    <div className={bookingsPageStyles.posterContainer}>
                      <img
                        src={b.poster || ""}
                        alt={b.title}
                        className={bookingsPageStyles.poster}
                      />
                    </div>

                    <div className={bookingsPageStyles.cardInfo}>
                      <div className={bookingsPageStyles.cardHeader}>
                        <div>
                          <h2
                            id={`booking-${b.id}-title`}
                            className={bookingsPageStyles.movieTitle}
                          >
                            <Film className={bookingsPageStyles.movieIcon} />
                            <span>{b.title}</span>
                          </h2>

                          <div className={bookingsPageStyles.bookingId}>
                            Booking ID:{" "}
                            <span className={bookingsPageStyles.bookingIdText}>
                              {b.id}
                            </span>
                          </div>
                        </div>

                        <div className={bookingsPageStyles.category}>
                          <div className="hidden lg:block">{b.category}</div>
                        </div>
                      </div>

                      <div className={bookingsPageStyles.details}>
                        <div className={bookingsPageStyles.timeContainer}>
                          <Clock className={bookingsPageStyles.timeIcon} />
                          <div>{formatTime(b.slotTime)}</div>
                        </div>

                        <div className={bookingsPageStyles.locationContainer}>
                          <MapPin className={bookingsPageStyles.locationIcon} />
                          <div className={bookingsPageStyles.locationText}>{b.auditorium}</div>
                        </div>
                      </div>

                      <div className={bookingsPageStyles.durationLabel}>Duration</div>
                      <div className={bookingsPageStyles.duration}>
                        {formatDuration(b.durationMins)}
                      </div>
                    </div>
                  </div>

                  <div className={bookingsPageStyles.summary}>
                    <div className={bookingsPageStyles.seatsLabel}>
                      Seats ({totals.seatCount})
                    </div>
                    <div className={bookingsPageStyles.total}>
                      ₹{totals.total.toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div
                    className={`${bookingsPageStyles.expandedDetails} ${
                      isOpen ? bookingsPageStyles.expandedOpen : bookingsPageStyles.expandedClosed
                    }`}
                    aria-hidden={!isOpen}
                  >
                    <div className={bookingsPageStyles.seatsSection}>
                      <div className={bookingsPageStyles.seatsLabelExpanded}>
                        Seats ({totals.seatCount})
                      </div>
                      <div className={bookingsPageStyles.seatsContainer}>
                        {(b.seats || []).map((s) => (
                          <div
                            key={s.id || s}
                            className={bookingsPageStyles.seatItem}
                          >
                            <div className={bookingsPageStyles.seatId}>{s.id || s}</div>
                            <div
                              className={`${bookingsPageStyles.seatType} ${
                                s.type === "recliner"
                                  ? bookingsPageStyles.seatTypeRecliner
                                  : bookingsPageStyles.seatTypeStandard
                              }`}
                            >
                              {s.type === "recliner" ? "Recliner" : "Standard"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={bookingsPageStyles.pricing}>
                      <div className={bookingsPageStyles.subtotal}>
                        <div>Seats subtotal</div>
                        <div>₹{totals.subtotal.toLocaleString("en-IN")}</div>
                      </div>

                      <div className={bookingsPageStyles.finalTotal}>
                        <div>Total</div>
                        <div>₹{totals.total.toLocaleString("en-IN")}</div>
                      </div>
                    </div>

                    <div className={bookingsPageStyles.qrSection}>
                      <div className={bookingsPageStyles.qrLabel}>
                        <QrCode className={bookingsPageStyles.qrIcon} />
                        <div>Ticket QR</div>
                      </div>
                      <div className="ml-auto">
                        {qrs[b.id] && qrs[b.id].url ? (
                          <img
                            src={qrs[b.id].url}
                            alt={`${b.title} qr`}
                            className={bookingsPageStyles.qrImage}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleQrScan(b.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleQrScan(b.id);
                            }}
                          />
                        ) : (
                          <div className={bookingsPageStyles.qrUnavailable}>
                            QR unavailable
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={bookingsPageStyles.toggleButton}>
                    <button
                      onClick={() => toggle(b.id)}
                      aria-expanded={isOpen}
                      className={bookingsPageStyles.detailsButton}
                    >
                      <span>{isOpen ? "Hide details" : "View details"}</span>
                      <ChevronDown
                        className={`${bookingsPageStyles.chevron} ${
                          isOpen ? bookingsPageStyles.chevronOpen : bookingsPageStyles.chevronClosed
                        }`}
                      />
                    </button>
                  </div>
                </article>
              );

              })
            )}
          </div>
      </div>

      {/* Scaner details */}
      {scannedDetails && (
        <div
          className={bookingsPageStyles.modalOverlay}
          aria-modal="true"
          role="dialog"
        >
          <div
            className={bookingsPageStyles.modalBackdrop}
            onClick={closeModal}
            aria-hidden="true"
          />
          <div className={bookingsPageStyles.modalContent}>
            <div className={bookingsPageStyles.modalHeader}>
              <div>
                <h3 className={bookingsPageStyles.modalTitle}>
                  {scannedDetails.title}
                </h3>
                <div className={bookingsPageStyles.modalBookingId}>
                  Booking ID:{" "}
                  <span className={bookingsPageStyles.modalIdText}>
                    {scannedDetails.bookingId}
                  </span>
                </div>
                <div className={bookingsPageStyles.modalDetails}>
                  <div>
                    <strong>Time:</strong> {scannedDetails.time}
                  </div>
                  <div>
                    <strong>Auditorium:</strong> {scannedDetails.auditorium}
                  </div>
                  <div className="mt-2">
                    <strong>Seats:</strong>{" "}
                    {Array.isArray(scannedDetails.seats)
                      ? scannedDetails.seats.join(", ")
                      : scannedDetails.seats}
                  </div>
                </div>
              </div>

              <button
                onClick={closeModal}
                className={bookingsPageStyles.modalCloseButton}
                aria-label="Close scanned details"
              >
                <X className={bookingsPageStyles.modalCloseIcon} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

}  



export default BookingsPage
