import express from "express";

import authMiddleware from "../middlewares/auth.js";
import { confirmPayment, createBooking, deleteBooking, getBooking, getOccupiedSeats, listBookings } from "../controllers/bookingController.js";

const bookingRouter = express.Router();

bookingRouter.post("/",authMiddleware, createBooking);
bookingRouter.get("/confirm-payment",confirmPayment);
bookingRouter.get("/", listBookings);
bookingRouter.get("/occupied", getOccupiedSeats)

bookingRouter.get("/my", authMiddleware,getBooking)
bookingRouter.delete("/:id",deleteBooking)
 
export default bookingRouter;