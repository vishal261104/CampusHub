import Announcement from "./announcement.model.js";
import AnnouncementRead from "./announcementRead.model.js";
import StudentFeeRecord from "../fees/studentFeeRecord.model.js";
import CourseOffering from "../courses/courseOffering.model.js";
import Assessment from "../assessments/assessment.model.js";
import BusSchedule from "../transport/busSchedule.model.js";
import Bus from "../transport/bus.model.js";
import User from "../users/user.model.js";

// ─── SYSTEM USER ─────────────────────────────────────────────────────────────
// A virtual system ObjectId used as createdBy for all automated announcements.
// We pick the first admin from the DB at runtime.
let _systemUserId = null;
async function getSystemUserId() {
    if (_systemUserId) return _systemUserId;
    const admin = await User.findOne({ role: "admin" }).select("_id").lean();
    _systemUserId = admin?._id || null;
    return _systemUserId;
}

// ─── DEDUP HELPER ─────────────────────────────────────────────────────────────
/**
 * Creates an announcement only if one with the same dedup key doesn't already
 * exist in the last `windowHours` hours. Prevents repeated automated spam.
 *
 * @param {Object} announcementData  - Fields for Announcement.create()
 * @param {String} dedupKey          - Unique string key (stored in title field check)
 * @param {Number} windowHours       - How far back to look for duplicates (default 20h)
 */
async function autoAnnounce(announcementData, dedupKey, windowHours = 20) {
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const existing = await Announcement.findOne({
        title: announcementData.title,
        createdAt: { $gte: cutoff },
    }).lean();

    if (existing) return null; // Already announced recently

    const createdBy = await getSystemUserId();
    if (!createdBy) {
        console.warn("[automation] No admin user found — cannot create automated announcement");
        return null;
    }

    return Announcement.create({ ...announcementData, createdBy });
}

// ─── HELPER FORMATTERS ─────────────────────────────────────────────────────────
function fmtINR(n) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
}
function fmtDate(d) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

// ─── 1. FEE DEADLINE SCANNER ─────────────────────────────────────────────────
/**
 * Scans for upcoming fee payment deadlines and publishes automated announcements.
 * Triggers: 10 days, 5 days, 2 days, and 1 day before the due date.
 * Audience: all students (global broadcast, not per-student to avoid spam).
 */
export async function scanFeeDeadlineAnnouncements() {
    const now = new Date();
    const windows = [
        { days: 10, label: "10 Days",  priority: "normal"    },
        { days: 5,  label: "5 Days",   priority: "important" },
        { days: 2,  label: "2 Days",   priority: "urgent"    },
        { days: 1,  label: "Tomorrow", priority: "urgent"    },
    ];

    for (const win of windows) {
        const from = new Date(now.getTime() + (win.days - 0.5) * 86400000);
        const to   = new Date(now.getTime() + (win.days + 0.5) * 86400000);

        const records = await StudentFeeRecord.find({
            dueDate: { $gte: from, $lte: to },
            status: { $in: ["Pending", "Partial"] },
        }).lean();

        if (records.length === 0) continue;

        // Group by semester+year — one announcement per group
        const grouped = {};
        for (const r of records) {
            const key = `${r.semester}-${r.year}`;
            if (!grouped[key]) grouped[key] = { semester: r.semester, year: r.year, count: 0, dueDate: r.dueDate };
            grouped[key].count++;
        }

        for (const [, g] of Object.entries(grouped)) {
            const title = `🔔 Fee Payment Due in ${win.label} — ${g.semester} ${g.year}`;
            const body  = `This is an automated reminder: the fee payment deadline for ${g.semester} ${g.year} is ${fmtDate(g.dueDate)}. ${g.count} student(s) still have pending payments. Please complete your payment on the Fees portal to avoid late charges.`;

            await autoAnnounce(
                { title, body, category: "FeeReminder", audience: "students", priority: win.priority },
                title,
                22
            );
        }
    }

    console.log("[automation] Fee deadline announcements scan complete.");
}

// ─── 2. ENROLLMENT WINDOW SCANNER ────────────────────────────────────────────
/**
 * Scans for course offerings whose enrollment window is about to open or close.
 * Triggers: 3 days before enrollStarts and 2 days before enrollEnds.
 * Audience: all students.
 */
export async function scanEnrollmentWindowAnnouncements() {
    const now = new Date();

    // Enrollment OPENING soon (3 days ahead)
    const openFrom = new Date(now.getTime() + 2.5 * 86400000);
    const openTo   = new Date(now.getTime() + 3.5 * 86400000);
    const openingSoon = await CourseOffering.find({
        enrollStarts: { $gte: openFrom, $lte: openTo },
        status: "Open",
    }).populate("courseId", "courseTitle courseCode").lean();

    for (const o of openingSoon) {
        const label = o.courseId?.courseTitle || o.courseId?.courseCode || "a course";
        const title = `📅 Enrollment Opens in 3 Days — ${o.semester} ${o.year} (§${o.section})`;
        const body  = `Course enrollment for ${label} (${o.semester} ${o.year}, Section ${o.section}) opens on ${fmtDate(o.enrollStarts)}. Make sure you're ready to register on time. Visit the Enrollment portal.`;

        await autoAnnounce(
            { title, body, category: "University", audience: "students", priority: "important" },
            title,
            48
        );
    }

    // Enrollment CLOSING soon (2 days ahead)
    const closeFrom = new Date(now.getTime() + 1.5 * 86400000);
    const closeTo   = new Date(now.getTime() + 2.5 * 86400000);
    const closingSoon = await CourseOffering.find({
        enrollEnds: { $gte: closeFrom, $lte: closeTo },
        status: "Open",
    }).populate("courseId", "courseTitle courseCode").lean();

    for (const o of closingSoon) {
        const label = o.courseId?.courseTitle || o.courseId?.courseCode || "a course";
        const title = `⚠️ Enrollment Closes in 2 Days — ${o.semester} ${o.year} (§${o.section})`;
        const body  = `Last chance! Course enrollment for ${label} (Section ${o.section}) closes on ${fmtDate(o.enrollEnds)}. Students who have not enrolled will not be able to register after this date.`;

        await autoAnnounce(
            { title, body, category: "University", audience: "students", priority: "urgent" },
            title,
            48
        );
    }

    console.log("[automation] Enrollment window announcements scan complete.");
}

// ─── 3. SEMESTER START / END SCANNER ─────────────────────────────────────────
/**
 * Detects when all offerings for a semester are created (enrollment starts)
 * to announce semester registration has opened. Also announces when enrollment period ends.
 * Trigger: First time offerings for a new semester+year appear in DB.
 */
export async function scanSemesterAnnouncements() {
    const now = new Date();

    // Announce when a semester's enrollment has JUST opened (within last 24h)
    const recentlyOpened = await CourseOffering.find({
        enrollStarts: { $gte: new Date(now.getTime() - 24 * 3600000), $lte: now },
        status: "Open",
    }).lean();

    // Group by semester+year
    const semGroups = {};
    for (const o of recentlyOpened) {
        const key = `${o.semester}-${o.year}`;
        if (!semGroups[key]) semGroups[key] = { semester: o.semester, year: o.year, count: 0 };
        semGroups[key].count++;
    }

    for (const [, g] of Object.entries(semGroups)) {
        const title = `🎓 ${g.semester} ${g.year} Semester Registration is Now Open!`;
        const body  = `Enrollment for the ${g.semester} ${g.year} semester has officially opened. ${g.count} course offering(s) are now available for registration. Log in to the Enrollment portal to browse and register for your courses. Seats are limited — register early!`;

        await autoAnnounce(
            { title, body, category: "University", audience: "students", priority: "important" },
            title,
            48
        );
    }

    // Announce when enrollment for a semester has JUST closed (within last 24h)
    const recentlyClosed = await CourseOffering.find({
        enrollEnds: { $gte: new Date(now.getTime() - 24 * 3600000), $lte: now },
        status: "Open",
    }).lean();

    const closedGroups = {};
    for (const o of recentlyClosed) {
        const key = `${o.semester}-${o.year}`;
        if (!closedGroups[key]) closedGroups[key] = { semester: o.semester, year: o.year };
    }

    for (const [, g] of Object.entries(closedGroups)) {
        const title = `🔒 Enrollment Closed — ${g.semester} ${g.year} Semester`;
        const body  = `The enrollment window for the ${g.semester} ${g.year} semester has now closed. Students who have not completed registration should contact the academic office. Timetables for enrolled students are now visible in the Timetable section.`;

        await autoAnnounce(
            { title, body, category: "University", audience: "students", priority: "normal" },
            title,
            48
        );
    }

    console.log("[automation] Semester event announcements scan complete.");
}

// ─── 4. ASSESSMENT DUE DATE SCANNER ──────────────────────────────────────────
/**
 * Scans for upcoming assessment due dates and broadcasts reminders.
 * Triggers: 3 days and 1 day before dueDate for Published assessments.
 * Audience: students enrolled in the specific course (audience = "course").
 */
export async function scanAssessmentDueDateAnnouncements() {
    const now = new Date();
    const windows = [
        { days: 3, label: "3 Days",   priority: "important" },
        { days: 1, label: "Tomorrow", priority: "urgent"    },
    ];

    for (const win of windows) {
        const from = new Date(now.getTime() + (win.days - 0.5) * 86400000);
        const to   = new Date(now.getTime() + (win.days + 0.5) * 86400000);

        const assessments = await Assessment.find({
            status: "Published",
            dueDate: { $gte: from, $lte: to },
        }).populate({
            path: "courseOfferingId",
            populate: { path: "courseId", select: "courseTitle courseCode" },
        }).lean();

        for (const a of assessments) {
            const courseName = a.courseOfferingId?.courseId?.courseTitle
                || a.courseOfferingId?.courseId?.courseCode
                || "your course";

            const title = `⏰ ${a.type}: "${a.title}" Due in ${win.label} — ${courseName}`;
            const body  = `Reminder: Your ${a.type.toLowerCase()} "${a.title}" for ${courseName} is due on ${fmtDate(a.dueDate)}. Make sure to submit on time. Check the Assessments portal for details.`;

            await autoAnnounce(
                {
                    title, body,
                    category: a.type === "Assignment" ? "Assignment" : a.type === "Quiz" ? "Quiz" : "ExamSchedule",
                    audience: "course",
                    courseOfferingId: a.courseOfferingId?._id,
                    priority: win.priority,
                },
                title,
                22
            );
        }
    }

    console.log("[automation] Assessment due date announcements scan complete.");
}

// ─── 5. BUS SCHEDULE SCANNER ──────────────────────────────────────────────────
/**
 * Scans for tomorrow's bus schedules and publishes a daily transport advisory.
 * Also checks for any cancelled schedules in the last hour to announce them.
 * Triggers: Once a day (handled by cron interval in index.js).
 */
export async function scanBusScheduleAnnouncements() {
    const now = new Date();

    // ── Tomorrow's trips summary ─────────────────────────────────────────────
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const tomorrowSchedules = await BusSchedule.find({
        date: { $gte: tomorrow, $lt: dayAfter },
        status: "Scheduled",
    }).populate("busId").lean();

    if (tomorrowSchedules.length > 0) {
        const routeList = tomorrowSchedules
            .map(s => `• ${s.routeName} (${s.departureTime} from ${s.departureLocation})`)
            .join("\n");

        const title = `🚌 Transport Advisory — ${fmtDate(tomorrow)}`;
        const body  = `${tomorrowSchedules.length} bus trip(s) are scheduled for tomorrow:\n${routeList}\n\nBook your seat early through the Transport portal.`;

        await autoAnnounce(
            { title, body, category: "TransportNotice", audience: "students", priority: "normal" },
            title,
            20
        );
    }

    // ── Recently Cancelled trips (last 2 hours) ───────────────────────────────
    const recentCancelled = await BusSchedule.find({
        status: "Cancelled",
        updatedAt: { $gte: new Date(now.getTime() - 2 * 3600000) },
    }).populate("busId").lean();

    for (const s of recentCancelled) {
        const title = `🚨 Trip Cancelled — ${s.routeName} on ${fmtDate(s.date)}`;
        const body  = `The bus trip "${s.routeName}" (${s.departureTime} from ${s.departureLocation} to ${s.destination}) on ${fmtDate(s.date)} has been cancelled. All existing bookings have been voided. We apologize for the inconvenience. Please make alternate arrangements.`;

        await autoAnnounce(
            { title, body, category: "TransportNotice", audience: "students", priority: "urgent" },
            title,
            4 // Short window — real-time cancellation alert
        );
    }

    console.log("[automation] Bus schedule announcements scan complete.");
}

// ─── 6. FEE STRUCTURE UPDATE ANNOUNCER ───────────────────────────────────────
/**
 * Called directly from fee.service.js when a fee structure is CREATED or UPDATED.
 * Immediately fires an announcement — no polling required.
 *
 * @param {Object} fee - The FeeStructure document
 * @param {String} action - "created" or "updated"
 */
export async function announceFeeStructureChange(fee, action) {
    const verb = action === "created" ? "published" : "updated";
    const title = `💰 Fee Structure ${verb === "published" ? "Published" : "Updated"} — ${fee.category} (${fee.semester} ${fee.year})`;
    const body  = `The ${fee.label} fee for ${fee.semester} ${fee.year} has been ${verb}. New amount: ${fmtINR(fee.amount)}. ${fee.description ? fee.description : "Please check the Fees portal for more details and payment deadlines."}`;

    await autoAnnounce(
        { title, body, category: "FeeReminder", audience: "students", priority: "important" },
        title,
        4
    );
}

// ─── 7. ASSESSMENT PUBLISHED ANNOUNCER ───────────────────────────────────────
/**
 * Called directly from assessment.service.js when an assessment is published.
 * Immediately fires an announcement to the enrolled course students.
 *
 * @param {Object} assessment - The Assessment document (with courseOfferingId populated)
 * @param {String} courseName - Human-readable course name
 */
export async function announceAssessmentPublished(assessment, courseName) {
    const dueStr = assessment.dueDate ? ` — Due: ${fmtDate(assessment.dueDate)}` : "";
    const title  = `📢 ${assessment.type} Published: "${assessment.title}" — ${courseName}`;
    const body   = `Your ${assessment.type.toLowerCase()} "${assessment.title}" has been published for ${courseName}. Total marks: ${assessment.totalMarks}. Passing marks: ${assessment.passingMarks}${dueStr}. Check the Assessments portal for full details.`;

    await autoAnnounce(
        {
            title, body,
            category: assessment.type === "Assignment" ? "Assignment" : assessment.type === "Quiz" ? "Quiz" : "ExamSchedule",
            audience: "course",
            courseOfferingId: assessment.courseOfferingId,
            priority: "important",
        },
        title,
        4
    );
}

// ─── 8. BUS DEACTIVATION ANNOUNCER ───────────────────────────────────────────
/**
 * Called directly from transport.service.js when a bus is deactivated.
 * Immediately fires an announcement.
 *
 * @param {Object} bus - The Bus document
 */
export async function announceBusDeactivated(bus) {
    const title = `🚌 Bus Service Update — Bus ${bus.busNumber} Deactivated`;
    const body  = `Bus ${bus.busNumber} (Registration: ${bus.registrationNumber}) has been temporarily deactivated. Any upcoming schedules on this bus may be affected. Please check the Transport portal for updated trip listings.`;

    await autoAnnounce(
        { title, body, category: "TransportNotice", audience: "students", priority: "important" },
        title,
        4
    );
}

// ─── SCHEDULE CANCELLED (event-driven hook from transport.service.js) ─────────
/**
 * Called directly from transport.service.js when a schedule is cancelled via
 * dynamic import. Publishes a public announcement for the cancellation.
 *
 * @param {Object} schedule - The BusSchedule document
 */
export async function announceBusScheduleCancelled(schedule) {
    const title = `🚨 Trip Cancelled — ${schedule.routeName} on ${fmtDate(schedule.date)}`;
    const body  = `The bus trip "${schedule.routeName}" (${schedule.departureTime} from ${schedule.departureLocation} to ${schedule.destination}) on ${fmtDate(schedule.date)} has been cancelled. All existing bookings have been voided. We apologize for the inconvenience. Please make alternate arrangements.`;

    await autoAnnounce(
        { title, body, category: "TransportNotice", audience: "students", priority: "urgent" },
        title,
        4
    );
}

// ─── 9. NEW BUS ADDED ANNOUNCER ──────────────────────────────────────────────
/**
 * Called directly from transport.service.js when a new bus is added.
 *
 * @param {Object} bus - The Bus document
 */
export async function announceNewBus(bus) {
    const title = `🚌 New Bus Added to Fleet — Bus ${bus.busNumber}`;
    const body  = `A new bus (Bus No. ${bus.busNumber}, Capacity: ${bus.capacity} seats) has been added to the campus transport fleet. New routes and schedules may be available soon. Check the Transport portal for updates.`;

    await autoAnnounce(
        { title, body, category: "TransportNotice", audience: "students", priority: "normal" },
        title,
        4
    );
}

// ─── 10. COURSE OFFERING CLOSED ANNOUNCER ────────────────────────────────────
/**
 * Called directly from courseOffering.service.js when a course offering is closed.
 *
 * @param {Object} offering - Populated CourseOffering document
 */
export async function announceCourseOfferingClosed(offering) {
    const courseName = offering.courseId?.courseTitle || offering.courseId?.courseCode || "a course";
    const title = `🔒 Enrollment Closed — ${courseName} §${offering.section} (${offering.semester} ${offering.year})`;
    const body  = `Enrollment for ${courseName} (Section ${offering.section}, ${offering.semester} ${offering.year}) has been closed. No further registrations will be accepted. Students who are currently enrolled will continue normally.`;

    await autoAnnounce(
        { title, body, category: "University", audience: "students", priority: "normal" },
        title,
        4
    );
}

// ─── MASTER SCAN RUNNER ───────────────────────────────────────────────────────
/**
 * Runs all scheduled (time-based) scanners at once.
 * Called on startup and then every hour by the scheduler in index.js.
 */
export async function runAllAutomatedScans() {
    console.log("[automation] Running all automated announcement scans...");
    try {
        await scanFeeDeadlineAnnouncements();
        await scanEnrollmentWindowAnnouncements();
        await scanSemesterAnnouncements();
        await scanAssessmentDueDateAnnouncements();
        await scanBusScheduleAnnouncements();
    } catch (err) {
        console.error("[automation] Scan failed:", err.message);
    }
    console.log("[automation] All scans complete.");
}
