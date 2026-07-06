import express from "express";
import * as TransportController from "./transport.controller.js";
import authMiddleware from '../../middleware/authMiddleware.js';
import authRoles from '../../middleware/authRoles.js';
import attachUser from '../../middleware/attachUser.js';

const router = express.Router();

/**
 * Middleware to authenticate and attach the user document to all transport routes.
 */
router.use(authMiddleware);
router.use(attachUser);

// ─── PUBLIC/AUTHENTICATED TRANSPORT ROUTES ────────────────────────────────────────

/**
 * GET /api/transport/buses
 * Fetches all registered buses.
 */
router.get("/buses", TransportController.getAllBuses);

/**
 * GET /api/transport/schedules
 * Fetches all active bus schedules (optionally filtered by date).
 */
router.get("/schedules", TransportController.getSchedules);

/**
 * GET /api/transport/schedules/:id
 * Fetches a specific bus schedule by its ID.
 */
router.get("/schedules/:id", TransportController.getScheduleById);

/**
 * GET /api/transport/timetable
 * Fetches the weekly recurring timetable grid.
 */
router.get("/timetable", TransportController.getTimetable);

/**
 * GET /api/transport/timetable/guidelines
 * Fetches the active transport guidelines list.
 */
router.get("/timetable/guidelines", TransportController.getGuidelines);

// ─── ADMIN BUS & SCHEDULE MANAGEMENT ROUTES ───────────────────────────────────────

/**
 * POST /api/transport/buses
 * Registers a new bus (Admin only).
 */
router.post("/buses", authRoles('admin'), TransportController.createBus);

/**
 * PATCH /api/transport/buses/:id
 * Updates an existing bus (Admin only).
 */
router.patch("/buses/:id", authRoles('admin'), TransportController.updateBus);

/**
 * DELETE /api/transport/buses/:id
 * Soft deletes or deactivates a bus (Admin only).
 */
router.delete("/buses/:id", authRoles('admin'), TransportController.deleteBus);

/**
 * POST /api/transport/schedules
 * Manually creates a new daily schedule (Admin only).
 */
router.post("/schedules", authRoles('admin'), TransportController.createSchedule);

/**
 * PATCH /api/transport/schedules/:id
 * Updates an existing daily schedule (Admin only).
 */
router.patch("/schedules/:id", authRoles('admin'), TransportController.updateSchedule);

/**
 * DELETE /api/transport/schedules/:id
 * Cancels an existing daily schedule (Admin only).
 */
router.delete("/schedules/:id", authRoles('admin'), TransportController.deleteSchedule);

// ─── ADMIN TIMETABLE MANAGEMENT ROUTES ────────────────────────────────────────────

/**
 * POST /api/transport/timetable/slot
 * Adds a new recurring slot to the timetable (Admin only).
 */
router.post("/timetable/slot", authRoles('admin'), TransportController.createTimetableSlot);

/**
 * PATCH /api/transport/timetable/slot/:id
 * Updates an existing recurring timetable slot (Admin only).
 */
router.patch("/timetable/slot/:id", authRoles('admin'), TransportController.updateTimetableSlot);

/**
 * DELETE /api/transport/timetable/slot/:id
 * Removes a recurring slot from the timetable (Admin only).
 */
router.delete("/timetable/slot/:id", authRoles('admin'), TransportController.deleteTimetableSlot);

/**
 * PUT /api/transport/timetable/guidelines
 * Replaces the list of transport guidelines (Admin only).
 */
router.put("/timetable/guidelines", authRoles('admin'), TransportController.updateGuidelines);

// ─── ADMIN DASHBOARD & ANALYTICS ROUTES ───────────────────────────────────────────

/**
 * GET /api/transport/bookings
 * Fetches all student ticket bookings across all schedules (Admin only).
 */
router.get("/bookings", authRoles('admin'), TransportController.getAllBookings);

/**
 * GET /api/transport/analytics
 * Fetches high-level metrics (total trips, revenue, bookings) (Admin only).
 */
router.get("/analytics", authRoles('admin'), TransportController.getAnalytics);

// ─── STUDENT BOOKING ROUTES ───────────────────────────────────────────────────────

/**
 * POST /api/transport/book/intent
 * Initializes a Stripe PaymentIntent for a specific schedule booking.
 */
router.post("/book/intent", authRoles('student'), TransportController.bookTicketIntent);

/**
 * POST /api/transport/book/from-timetable
 * Finds or creates today's schedule from a timetable slot, then initializes Stripe payment.
 */
router.post("/book/from-timetable", authRoles('student'), TransportController.bookTicketFromTimetable);

/**
 * POST /api/transport/book/confirm
 * Verifies the Stripe payment intent and generates the final digital ticket.
 */
router.post("/book/confirm", authRoles('student'), TransportController.confirmTicketPayment);

/**
 * GET /api/transport/my-tickets
 * Fetches all active and historic tickets for the logged-in student.
 */
router.get("/my-tickets", authRoles('student'), TransportController.getMyTickets);

/**
 * GET /api/transport/ticket/:id
 * Fetches details of a specific ticket.
 */
router.get("/ticket/:id", authRoles('student'), TransportController.getTicketById);

/**
 * DELETE /api/transport/ticket/:id
 * Cancels an active ticket, releases the seat, and processes a refund.
 */
router.delete("/ticket/:id", authRoles('student'), TransportController.cancelTicket);

export default router;
