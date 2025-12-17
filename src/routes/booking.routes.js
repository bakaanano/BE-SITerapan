import express from 'express';
import { createBooking, getUserBookings, getAllBookings, updateBookingStatus } from '../controller/booking.controller.js';

const router = express.Router();

router.post('/', createBooking);
router.get('/user/:user_id', getUserBookings);
router.get('/', getAllBookings);
router.put('/:id', updateBookingStatus);

export default router;
