import Stripe from "stripe";
import Bus from "./bus.model.js";
import BusSchedule from "./busSchedule.model.js";
import Ticket from "./ticket.model.js";
import TimetableSlot from "./timetableSlot.model.js";
import BusGuidelines from "./busGuidelines.model.js";

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey || stripeKey.includes('your_stripe_secret_key_here')) {
    console.warn('[Transport] STRIPE_SECRET_KEY is not configured — online payments will be disabled.');
}
const stripe = stripeKey && !stripeKey.includes('your_stripe') ? new Stripe(stripeKey) : null;

/**
 * Validates that Stripe has been properly configured before attempting payment operations.
 */
function assertStripeConfigured() {
    if (!stripe) {
        const err = new Error('Online payments are not configured yet.');
        err.status = 503;
        throw err;
    }
}

// ─── BUS MANAGEMENT ─────────────────────────────────────────────────────────────

/**
 * Creates a new bus document in the database.
 * @param {Object} data - Bus details (busNumber, registrationNumber, capacity, fare, conductor, etc.)
 */
export async function createBus(data) {
    return await Bus.create(data);
}

/**
 * Updates an existing bus document by its ID.
 * @param {String} id - The MongoDB ObjectID of the bus
 * @param {Object} data - Fields to update
 */
export async function updateBus(id, data) {
    const bus = await Bus.findByIdAndUpdate(id, data, { new: true });
    if (!bus) throw Object.assign(new Error("Bus not found"), { status: 404 });
    return bus;
}

/**
 * Fetches all buses from the database, sorted by creation date descending.
 */
export async function getAllBuses() {
    return await Bus.find().sort({ createdAt: -1 });
}

/**
 * Deletes a bus document. Prevents deletion if schedules are attached.
 * @param {String} id - The MongoDB ObjectID of the bus
 */
export async function deleteBus(id) {
    const schedulesCount = await BusSchedule.countDocuments({ busId: id });
    if (schedulesCount > 0) {
        throw Object.assign(new Error("Cannot delete bus with existing schedules. Deactivate it instead."), { status: 400 });
    }
    const bus = await Bus.findByIdAndDelete(id);
    if (!bus) throw Object.assign(new Error("Bus not found"), { status: 404 });
    return bus;
}

// ─── SCHEDULE MANAGEMENT ────────────────────────────────────────────────────────

/**
 * Legacy: Manually creates a one-off daily schedule for a bus.
 * Initializes availableSeats to the bus's maximum capacity.
 * @param {Object} data - Schedule details (busId, date, departureTime, etc.)
 */
export async function createSchedule(data) {
    const bus = await Bus.findById(data.busId);
    if (!bus) throw Object.assign(new Error("Bus not found"), { status: 404 });

    data.availableSeats = bus.capacity; 
    return await BusSchedule.create(data);
}

/**
 * Legacy: Updates an existing daily schedule.
 * @param {String} id - Schedule ID
 * @param {Object} data - Fields to update
 */
export async function updateSchedule(id, data) {
    const schedule = await BusSchedule.findByIdAndUpdate(id, data, { new: true });
    if (!schedule) throw Object.assign(new Error("Schedule not found"), { status: 404 });
    return schedule;
}

/**
 * Legacy: Soft deletes a schedule by marking it as 'Cancelled'.
 * Automatically notifies all students who had booked tickets for this schedule.
 * @param {String} id - Schedule ID
 */
export async function deleteSchedule(id) {
    const schedule = await BusSchedule.findByIdAndUpdate(id, { status: "Cancelled" }, { new: true });
    if (!schedule) throw Object.assign(new Error("Schedule not found"), { status: 404 });

    try {
        const { createNotification } = await import("../notifications/notification.service.js");
        const tickets = await Ticket.find({ scheduleId: id, bookingStatus: "Booked" }).populate("studentId");
        for (const ticket of tickets) {
            ticket.bookingStatus = "Cancelled";
            await ticket.save();
            await createNotification(
                ticket.studentId._id,
                "trip_cancelled",
                "Trip Cancelled",
                `Your trip from ${schedule.departureLocation} to ${schedule.destination} on ${new Date(schedule.date).toLocaleDateString()} has been cancelled.`,
                { scheduleId: schedule._id }
            );
        }
    } catch (err) {
        console.error("[Transport] Failed to notify students of cancelled trip:", err.message);
    }

    return schedule;
}

/**
 * Fetches all schedules, optionally filtering by date and status.
 * @param {Object} filters - Query filters (e.g., date, status)
 */
export async function getSchedules(filters = {}) {
    const query = {};
    if (filters.date) {
        const d = new Date(filters.date);
        d.setHours(0, 0, 0, 0);
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        query.date = { $gte: d, $lt: nextDay };
    }
    if (filters.status) query.status = filters.status;

    return await BusSchedule.find(query).populate("busId").sort({ date: 1, departureTime: 1 });
}

/**
 * Fetches a single schedule by ID, including populated bus details.
 * @param {String} id - Schedule ID
 */
export async function getScheduleById(id) {
    const schedule = await BusSchedule.findById(id).populate("busId");
    if (!schedule) throw Object.assign(new Error("Schedule not found"), { status: 404 });
    return schedule;
}

// ─── BOOKING & PAYMENT ──────────────────────────────────────────────────────────

/**
 * Initializes a Stripe PaymentIntent for booking a specific schedule.
 * @param {String} studentId - ID of the booking student
 * @param {String} scheduleId - ID of the schedule to book
 * @param {String} userEmail - Student's email for Stripe receipt
 */
export async function bookTicketIntent(studentId, scheduleId, userEmail) {
    assertStripeConfigured();

    const schedule = await BusSchedule.findById(scheduleId).populate("busId");
    if (!schedule) throw Object.assign(new Error("Schedule not found"), { status: 404 });
    
    if (schedule.status !== "Scheduled") {
        throw Object.assign(new Error(`Cannot book a ticket. Trip is ${schedule.status.toLowerCase()}.`), { status: 400 });
    }
    if (schedule.availableSeats <= 0) {
        throw Object.assign(new Error("Bus is completely full. No seats available."), { status: 400 });
    }

    const existingTicket = await Ticket.findOne({ studentId, scheduleId, bookingStatus: { $in: ["Booked", "Completed"] } });
    if (existingTicket) {
        throw Object.assign(new Error("You have already booked a ticket for this trip."), { status: 400 });
    }

    let amount = schedule.fare;
    if (amount <= 0) throw Object.assign(new Error("Free trips do not require payment."), { status: 400 });
    if (amount < 50) throw Object.assign(new Error("Fare is too low. Minimum fare for online payment is ₹50. Please update the schedule fare."), { status: 400 });

    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, 
        currency: "inr",
        automatic_payment_methods: { enabled: true },
        metadata: {
            studentId: String(studentId),
            scheduleId: String(scheduleId),
            studentEmail: userEmail || "",
        },
        description: `Bus Ticket: ${schedule.departureLocation} to ${schedule.destination}`,
    });

    return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        amount,
    };
}

/**
 * Confirms a successful Stripe payment, generates the digital ticket, decrements available seats,
 * and sends an in-app notification to the student.
 * @param {String} studentId - ID of the booking student
 * @param {String} paymentIntentId - ID of the successful Stripe PaymentIntent
 */
export async function confirmTicketPayment(studentId, paymentIntentId) {
    assertStripeConfigured();

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== "succeeded") {
        throw Object.assign(new Error(`Payment not confirmed. Stripe status: ${intent.status}`), { status: 400 });
    }

    const scheduleId = intent.metadata.scheduleId;
    if (!scheduleId) throw Object.assign(new Error("Invalid payment intent metadata"), { status: 400 });

    const existingTicket = await Ticket.findOne({ paymentIntentId });
    if (existingTicket) return existingTicket;

    const schedule = await BusSchedule.findById(scheduleId).populate("busId");
    if (!schedule) throw Object.assign(new Error("Schedule not found"), { status: 404 });

    if (schedule.availableSeats <= 0) {
        throw Object.assign(new Error("Sorry, the bus was filled while your payment was processing. Please contact admin for a refund."), { status: 400 });
    }

    const seatNumber = schedule.busId.capacity - schedule.availableSeats + 1;
    schedule.availableSeats -= 1;
    await schedule.save();

    const ticket = await Ticket.create({
        studentId,
        scheduleId,
        paymentIntentId,
        seatNumber,
        fare: intent.amount / 100,
        bookingStatus: "Booked",
    });

    try {
        const { createNotification } = await import("../notifications/notification.service.js");
        await createNotification(
            studentId,
            "payment_success",
            "Bus Ticket Confirmed! 🚍",
            `Your ticket from ${schedule.departureLocation} to ${schedule.destination} is confirmed. Seat No: ${seatNumber}.`,
            { ticketId: ticket._id }
        );
    } catch (err) {
        console.warn("[Transport] Failed to create notification:", err.message);
    }

    return ticket;
}

/**
 * Fetches all active and historic tickets for a given student.
 * @param {String} studentId - Student ID
 */
export async function getMyTickets(studentId) {
    return await Ticket.find({ studentId }).populate({
        path: "scheduleId",
        populate: { path: "busId" }
    }).sort({ bookedAt: -1 });
}

/**
 * Fetches a specific ticket by ID ensuring it belongs to the given student.
 * @param {String} studentId - Student ID
 * @param {String} ticketId - Ticket ID
 */
export async function getTicketById(studentId, ticketId) {
    const ticket = await Ticket.findOne({ _id: ticketId, studentId }).populate({
        path: "scheduleId",
        populate: { path: "busId" }
    });
    if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });
    return ticket;
}

/**
 * Cancels an active student ticket, frees up the seat on the schedule,
 * and sends an in-app cancellation notification.
 * @param {String} studentId - Student ID
 * @param {String} ticketId - Ticket ID
 */
export async function cancelTicket(studentId, ticketId) {
    const ticket = await Ticket.findOne({ _id: ticketId, studentId }).populate("scheduleId");
    if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });
    if (ticket.bookingStatus === "Cancelled") {
        throw Object.assign(new Error("Ticket is already cancelled."), { status: 400 });
    }
    if (ticket.bookingStatus === "Completed") {
        throw Object.assign(new Error("Completed trips cannot be cancelled."), { status: 400 });
    }

    const schedule = ticket.scheduleId;
    if (schedule.status !== "Scheduled") {
        throw Object.assign(new Error(`Cannot cancel: trip is already ${schedule.status.toLowerCase()}.`), { status: 400 });
    }

    await BusSchedule.findByIdAndUpdate(schedule._id, { $inc: { availableSeats: 1 } });

    ticket.bookingStatus = "Cancelled";
    await ticket.save();

    try {
        const { createNotification } = await import("../notifications/notification.service.js");
        await createNotification(
            studentId,
            "ticket_cancelled",
            "Ticket Cancelled",
            `Your ticket for ${schedule.departureLocation} → ${schedule.destination} has been cancelled. Seat ${ticket.seatNumber} is now free.`,
            { ticketId: ticket._id }
        );
    } catch (err) {
        console.warn("[Transport] Failed to send cancellation notification:", err.message);
    }

    return ticket;
}

// ─── ADMIN DASHBOARD ────────────────────────────────────────────────────────────

/**
 * Fetches all ticket bookings system-wide for the admin dashboard.
 */
export async function getAllBookings() {
    return await Ticket.find().populate("studentId", "name email studentId").populate({
        path: "scheduleId",
        populate: { path: "busId" }
    }).sort({ bookedAt: -1 });
}

/**
 * Generates high-level statistical analytics for the transport module.
 * Includes total buses, active buses, total schedules, completed trips, and gross revenue.
 */
export async function getAnalytics() {
    const totalBuses = await Bus.countDocuments();
    const activeBuses = await Bus.countDocuments({ isActive: true });
    const totalSchedules = await BusSchedule.countDocuments();
    const completedTrips = await BusSchedule.countDocuments({ status: "Completed" });
    const totalTickets = await Ticket.countDocuments({ bookingStatus: "Booked" });
    
    const revenueResult = await Ticket.aggregate([
        { $match: { bookingStatus: "Booked" } },
        { $group: { _id: null, totalRevenue: { $sum: "$fare" } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    return {
        totalBuses,
        activeBuses,
        totalSchedules,
        completedTrips,
        totalTickets,
        totalRevenue
    };
}

// ─── TIMETABLE MANAGEMENT ────────────────────────────────────────────────────────

/**
 * Fetches the complete recurring weekly timetable grouped by dayType (weekday/weekend).
 * Also returns the active transport guidelines.
 */
export async function getTimetable() {
    const slots = await TimetableSlot.find({ isActive: true })
        .populate("busId")
        .sort({ dayType: 1, "busId.busNumber": 1, order: 1 });
    
    const guidelines = await BusGuidelines.findOne({ singletonKey: "guidelines" });

    const grouped = {
        weekday: {},
        weekend: {},
    };

    for (const slot of slots) {
        const busKey = slot.busId._id.toString();
        if (!grouped[slot.dayType][busKey]) {
            grouped[slot.dayType][busKey] = {
                bus: slot.busId,
                slots: [],
            };
        }
        grouped[slot.dayType][busKey].slots.push(slot);
    }

    return {
        weekday: Object.values(grouped.weekday),
        weekend: Object.values(grouped.weekend),
        guidelines: guidelines?.items || [],
    };
}

/**
 * Creates a new recurring slot in the timetable and automatically assigns its sort order.
 * @param {Object} data - Timetable slot details (busId, dayType, departureTime, from, to)
 */
export async function createTimetableSlot(data) {
    const bus = await Bus.findById(data.busId);
    if (!bus) throw Object.assign(new Error("Bus not found"), { status: 404 });

    if (data.order === undefined) {
        const count = await TimetableSlot.countDocuments({ busId: data.busId, dayType: data.dayType, isActive: true });
        data.order = count;
    }

    return await TimetableSlot.create(data);
}

/**
 * Updates an existing timetable slot by ID.
 * @param {String} id - Timetable slot ID
 * @param {Object} data - Fields to update
 */
export async function updateTimetableSlot(id, data) {
    const slot = await TimetableSlot.findByIdAndUpdate(id, data, { new: true }).populate("busId");
    if (!slot) throw Object.assign(new Error("Timetable slot not found"), { status: 404 });
    return slot;
}

/**
 * Soft deletes a timetable slot by setting isActive to false.
 * @param {String} id - Timetable slot ID
 */
export async function deleteTimetableSlot(id) {
    const slot = await TimetableSlot.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!slot) throw Object.assign(new Error("Timetable slot not found"), { status: 404 });
    return slot;
}

/**
 * Fetches the ordered list of transport guidelines from the singleton document.
 */
export async function getGuidelines() {
    const doc = await BusGuidelines.findOne({ singletonKey: "guidelines" });
    return doc?.items || [];
}

/**
 * Replaces the entire list of transport guidelines via upsert on the singleton document.
 * @param {Array<String>} items - The new array of guideline text items
 */
export async function updateGuidelines(items) {
    const doc = await BusGuidelines.findOneAndUpdate(
        { singletonKey: "guidelines" },
        { items },
        { new: true, upsert: true }
    );
    return doc.items;
}

// ─── TIMETABLE-BASED BOOKING ──────────────────────────────────────────────────────

/**
 * Auto-creates today's BusSchedule (if it doesn't exist) from a recurring timetable slot
 * and initializes a Stripe payment intent for booking a ticket on that schedule.
 * @param {String} studentId - Booking student ID
 * @param {String} timetableSlotId - ID of the timetable slot chosen
 * @param {String} userEmail - Student email for Stripe receipts
 */
export async function bookTicketFromTimetable(studentId, timetableSlotId, userEmail) {
    assertStripeConfigured();

    const slot = await TimetableSlot.findById(timetableSlotId).populate("busId");
    if (!slot || !slot.isActive) throw Object.assign(new Error("Timetable slot not found"), { status: 404 });

    const bus = slot.busId;
    const fare = bus.fare;

    if (fare < 50) throw Object.assign(new Error("Fare is too low. Minimum fare is ₹50."), { status: 400 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let schedule = await BusSchedule.findOne({
        timetableSlotId: slot._id,
        date: { $gte: today, $lt: tomorrow },
    });

    if (!schedule) {
        schedule = await BusSchedule.create({
            busId: bus._id,
            timetableSlotId: slot._id,
            routeName: `${slot.from} → ${slot.to}`,
            departureTime: slot.departureTime,
            departureLocation: slot.from,
            destination: slot.to,
            date: today,
            fare,
            availableSeats: bus.capacity,
            status: "Scheduled",
        });
    }

    if (schedule.status !== "Scheduled") {
        throw Object.assign(new Error(`Cannot book: trip is ${schedule.status.toLowerCase()}.`), { status: 400 });
    }
    if (schedule.availableSeats <= 0) {
        throw Object.assign(new Error("Bus is full. No seats available."), { status: 400 });
    }

    const slotTickets = await Ticket.countDocuments({
        studentId,
        scheduleId: schedule._id,
        bookingStatus: { $ne: "Cancelled" },
    });
    if (slotTickets >= 2) {
        throw Object.assign(new Error("You can book a maximum of 2 tickets per trip."), { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
        amount: fare * 100,
        currency: "inr",
        automatic_payment_methods: { enabled: true },
        metadata: {
            studentId: String(studentId),
            scheduleId: String(schedule._id),
            studentEmail: userEmail || "",
        },
        description: `Bus Ticket: ${slot.from} to ${slot.to} at ${slot.departureTime}`,
    });

    return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        amount: fare,
        scheduleId: schedule._id,
    };
}
