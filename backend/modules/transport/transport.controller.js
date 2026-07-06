import * as TransportService from "./transport.service.js";

/**
 * Controller for creating a new bus.
 * Route: POST /api/transport/buses
 * Access: Admin
 */
export async function createBus(req, res, next) {
    try {
        const bus = await TransportService.createBus(req.body);
        res.status(201).json({ bus });
    } catch (err) { next(err); }
}

/**
 * Controller for updating an existing bus by ID.
 * Route: PATCH /api/transport/buses/:id
 * Access: Admin
 */
export async function updateBus(req, res, next) {
    try {
        const bus = await TransportService.updateBus(req.params.id, req.body);
        res.json({ bus });
    } catch (err) { next(err); }
}

/**
 * Controller to fetch all active and inactive buses.
 * Route: GET /api/transport/buses
 * Access: Public/Authenticated
 */
export async function getAllBuses(req, res, next) {
    try {
        const buses = await TransportService.getAllBuses();
        res.json({ buses });
    } catch (err) { next(err); }
}

/**
 * Controller for deleting a bus.
 * Route: DELETE /api/transport/buses/:id
 * Access: Admin
 */
export async function deleteBus(req, res, next) {
    try {
        await TransportService.deleteBus(req.params.id);
        res.json({ message: "Bus deleted successfully" });
    } catch (err) { next(err); }
}

/**
 * Legacy: Controller for manually creating a daily schedule.
 * Route: POST /api/transport/schedules
 * Access: Admin
 */
export async function createSchedule(req, res, next) {
    try {
        const schedule = await TransportService.createSchedule(req.body);
        res.status(201).json({ schedule });
    } catch (err) { next(err); }
}

/**
 * Legacy: Controller for updating a daily schedule.
 * Route: PATCH /api/transport/schedules/:id
 * Access: Admin
 */
export async function updateSchedule(req, res, next) {
    try {
        const schedule = await TransportService.updateSchedule(req.params.id, req.body);
        res.json({ schedule });
    } catch (err) { next(err); }
}

/**
 * Legacy: Controller for cancelling/deleting a daily schedule.
 * Route: DELETE /api/transport/schedules/:id
 * Access: Admin
 */
export async function deleteSchedule(req, res, next) {
    try {
        const schedule = await TransportService.deleteSchedule(req.params.id);
        res.json({ message: "Schedule cancelled successfully", schedule });
    } catch (err) { next(err); }
}

/**
 * Controller to fetch active schedules for a given date.
 * Route: GET /api/transport/schedules
 * Access: Public/Authenticated
 */
export async function getSchedules(req, res, next) {
    try {
        const schedules = await TransportService.getSchedules(req.query);
        res.json({ schedules });
    } catch (err) { next(err); }
}

/**
 * Controller to fetch a specific schedule by ID.
 * Route: GET /api/transport/schedules/:id
 * Access: Public/Authenticated
 */
export async function getScheduleById(req, res, next) {
    try {
        const schedule = await TransportService.getScheduleById(req.params.id);
        res.json({ schedule });
    } catch (err) { next(err); }
}

/**
 * Controller to fetch the full weekly timetable grid.
 * Route: GET /api/transport/timetable
 * Access: Public/Authenticated
 */
export async function getTimetable(req, res, next) {
    try {
        const timetable = await TransportService.getTimetable();
        res.json(timetable);
    } catch (err) { next(err); }
}

/**
 * Controller for creating a new recurring timetable slot.
 * Route: POST /api/transport/timetable/slot
 * Access: Admin
 */
export async function createTimetableSlot(req, res, next) {
    try {
        const slot = await TransportService.createTimetableSlot(req.body);
        res.status(201).json({ slot });
    } catch (err) { next(err); }
}

/**
 * Controller for updating a recurring timetable slot.
 * Route: PATCH /api/transport/timetable/slot/:id
 * Access: Admin
 */
export async function updateTimetableSlot(req, res, next) {
    try {
        const slot = await TransportService.updateTimetableSlot(req.params.id, req.body);
        res.json({ slot });
    } catch (err) { next(err); }
}

/**
 * Controller to soft-delete a timetable slot.
 * Route: DELETE /api/transport/timetable/slot/:id
 * Access: Admin
 */
export async function deleteTimetableSlot(req, res, next) {
    try {
        await TransportService.deleteTimetableSlot(req.params.id);
        res.json({ message: "Slot removed from timetable" });
    } catch (err) { next(err); }
}

/**
 * Controller to fetch the transport guidelines.
 * Route: GET /api/transport/timetable/guidelines
 * Access: Public/Authenticated
 */
export async function getGuidelines(req, res, next) {
    try {
        const items = await TransportService.getGuidelines();
        res.json({ guidelines: items });
    } catch (err) { next(err); }
}

/**
 * Controller to update the transport guidelines list.
 * Route: PUT /api/transport/timetable/guidelines
 * Access: Admin
 */
export async function updateGuidelines(req, res, next) {
    try {
        const items = await TransportService.updateGuidelines(req.body.items || []);
        res.json({ guidelines: items });
    } catch (err) { next(err); }
}

/**
 * Controller to initialize a Stripe payment intent for booking a ticket.
 * Route: POST /api/transport/book/intent
 * Access: Student
 */
export async function bookTicketIntent(req, res, next) {
    try {
        const { scheduleId } = req.body;
        if (!scheduleId) {
            return res.status(400).json({ message: 'scheduleId is required' });
        }
        const studentId = req.userDoc?._id || req.user?.id;
        const userEmail = req.userDoc?.email || req.user?.email || '';
        if (!studentId) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        const result = await TransportService.bookTicketIntent(studentId, scheduleId, userEmail);
        res.json(result);
    } catch (err) { next(err); }
}

/**
 * Controller to find/create today's schedule from a timetable slot and initialize payment.
 * Route: POST /api/transport/book/from-timetable
 * Access: Student
 */
export async function bookTicketFromTimetable(req, res, next) {
    try {
        const { timetableSlotId } = req.body;
        if (!timetableSlotId) {
            return res.status(400).json({ message: 'timetableSlotId is required' });
        }
        const studentId = req.userDoc?._id || req.user?.id;
        const userEmail = req.userDoc?.email || req.user?.email || '';
        if (!studentId) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        const result = await TransportService.bookTicketFromTimetable(studentId, timetableSlotId, userEmail);
        res.json(result);
    } catch (err) { next(err); }
}

/**
 * Controller to confirm a successful Stripe payment and generate the digital ticket.
 * Route: POST /api/transport/book/confirm
 * Access: Student
 */
export async function confirmTicketPayment(req, res, next) {
    try {
        const ticket = await TransportService.confirmTicketPayment(req.userDoc._id, req.body.paymentIntentId);
        res.json({ ticket });
    } catch (err) { next(err); }
}

/**
 * Controller to fetch all active and historic tickets for the logged-in student.
 * Route: GET /api/transport/my-tickets
 * Access: Student
 */
export async function getMyTickets(req, res, next) {
    try {
        const tickets = await TransportService.getMyTickets(req.userDoc._id);
        res.json({ tickets });
    } catch (err) { next(err); }
}

/**
 * Controller to fetch details of a specific ticket belonging to the logged-in student.
 * Route: GET /api/transport/ticket/:id
 * Access: Student
 */
export async function getTicketById(req, res, next) {
    try {
        const ticket = await TransportService.getTicketById(req.userDoc._id, req.params.id);
        res.json({ ticket });
    } catch (err) { next(err); }
}

/**
 * Controller to cancel an active ticket and process a refund/seat release.
 * Route: DELETE /api/transport/ticket/:id
 * Access: Student
 */
export async function cancelTicket(req, res, next) {
    try {
        const ticket = await TransportService.cancelTicket(req.userDoc._id, req.params.id);
        res.json({ ticket, message: 'Ticket cancelled successfully' });
    } catch (err) { next(err); }
}

/**
 * Controller to fetch all system-wide bookings for the admin view.
 * Route: GET /api/transport/bookings
 * Access: Admin
 */
export async function getAllBookings(req, res, next) {
    try {
        const bookings = await TransportService.getAllBookings();
        res.json({ bookings });
    } catch (err) { next(err); }
}

/**
 * Controller to generate summary analytics for the transport module.
 * Route: GET /api/transport/analytics
 * Access: Admin
 */
export async function getAnalytics(req, res, next) {
    try {
        const analytics = await TransportService.getAnalytics();
        res.json(analytics);
    } catch (err) { next(err); }
}

