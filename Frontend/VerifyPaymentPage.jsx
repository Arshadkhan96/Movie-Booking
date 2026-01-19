import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"


const VerifyPaymentPage = () =>{
const  [statusMsg, setStatusMsg] = useState("Verifying Payment...")
const navigate = useNavigate()
const location = useLocation()
const search = location.search || "";


const params = new URLSearchParams(search);
const rawSession = params.get("session_id");
const session_id = rawSession ? rawSession.trim() : null;
const payment_status = params.get("payment_status");

useEffect(() => {
    let cancelled = false;

    const verifyPayment = async () => {
        const token = localStorage.getItem("token");

        if (payment_status === "cancel") {
            navigate("/", { replace: true });
            return;
        }

        if (!session_id) {
            setStatusMsg("Invalid Payment Parameters");
            return;
        }

        try {
            setStatusMsg("Confirming payment with server...");
            const API_BASE = "http://localhost:5000";
            const res = await axios.get(
                `${API_BASE}/api/bookings/confirm-payment`,
                {
                    params: { session_id },
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    timeout: 15000,
                }
            );

            if (cancelled) return;

            if (res?.data?.success) {
                setStatusMsg("Payment confirmed successfully!");
                navigate("/bookings", { replace: true });
            } else {
                const msg = res?.data?.message || "Payment not confirmed.";
                setStatusMsg(msg);
            }
        } catch (err) {
            if (cancelled) return;
            console.error("Verification error:", err);
            const status = err?.response?.status;
            const serverMsg = err?.response?.data?.message;

            if (status === 404) {
                setStatusMsg(
                    serverMsg ||
                        "Payment session not found. If you were charged, contact support with your session ID."
                );
            } else if (status === 400) {
                setStatusMsg(serverMsg || "Payment not completed or invalid request.");
            } else {
                setStatusMsg(
                    serverMsg ||
                        "There was an error confirming your payment. If you were charged, please contact support."
                );
            }
        }
    };

    // Call the function
    verifyPayment();

    // Cleanup function
    return () => {
        cancelled = true;
    };
}, [search, navigate]);


    return(
        <div className="min-h-screen items-center flex justify-center text-white p-4">
            <div className="text-center max-w-lg">
                <p className="mb-2">{statusMsg}</p>
                <p className="text-sm opacity-70">
                    If this page shows "session not found", try copying the `session_id` from your browser URL
                    and verify t with your backend logs or contact support.
                </p>
            </div>
        </div>
    )
}
export default VerifyPaymentPage