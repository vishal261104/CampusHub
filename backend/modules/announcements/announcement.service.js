import Announcement, {
    ADMIN_CATEGORIES_LIST,
    FACULTY_CATEGORIES_LIST,
} from "./announcement.model.js";
import AnnouncementRead from "./announcementRead.model.js";
import CourseOffering from "../courses/courseOffering.model.js";
import Enrollment from "../enrollments/enrollment.model.js";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Builds a MongoDB $or filter that matches announcements visible to the user.
 * Audience resolution:
 *   - "all"        → always visible
 *   - "students"   → user is a student
 *   - "faculty"    → user is a faculty
 *   - "course"     → user is enrolled in courseOfferingId
 *   - "department" → user's department matches
 */
async function buildVisibilityFilter(userId, role, department) {
    const conditions = [{ audience: "all" }];

    if (role === "student") {
        conditions.push({ audience: "students" });

        // Enrolled course offerings
        const enrollments = await Enrollment.find({
            studentId: userId,
            status: "Enrolled",
        })
            .select("courseOfferingId")
            .lean();
        const offeringIds = enrollments.map((e) => e.courseOfferingId);
        if (offeringIds.length > 0) {
            conditions.push({ audience: "course", courseOfferingId: { $in: offeringIds } });
        }
    }

    if (role === "faculty") {
        conditions.push({ audience: "faculty" });
        // Faculty can see announcements targeted to courses they own
        const offerings = await CourseOffering.find({ facultyId: userId }).select("_id").lean();
        const offeringIds = offerings.map((o) => o._id);
        if (offeringIds.length > 0) {
            conditions.push({ audience: "course", courseOfferingId: { $in: offeringIds } });
        }
    }

    if (role === "admin" || role === "hostelAdmin") {
        // Admins see everything
        return {}; // empty filter = match all
    }

    if (department) {
        conditions.push({ audience: "department", department });
    }

    return { $or: conditions };
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

/**
 * Creates a new announcement.
 * Validates that the category is appropriate for the creator's role,
 * and that audience-specific fields are provided.
 */
export async function createAnnouncement(creatorId, role, data) {
    const { title, body, category, audience, courseOfferingId, department, priority, expiresAt } = data;

    if (!title?.trim() || !body?.trim() || !category || !audience) {
        const err = new Error("title, body, category, and audience are required");
        err.status = 400;
        throw err;
    }

    // Role-based category validation
    if (role === "faculty" && ADMIN_CATEGORIES_LIST.includes(category)) {
        const err = new Error("Faculty cannot create this category of announcement");
        err.status = 403;
        throw err;
    }
    if (role !== "admin" && ADMIN_CATEGORIES_LIST.includes(category) && role !== "admin") {
        if (!FACULTY_CATEGORIES_LIST.includes(category)) {
            const err = new Error("Invalid category for your role");
            err.status = 403;
            throw err;
        }
    }

    // Audience-specific validation
    if (audience === "course") {
        if (!courseOfferingId) {
            const err = new Error("courseOfferingId is required when audience is 'course'");
            err.status = 400;
            throw err;
        }
        // Faculty can only target offerings they own
        if (role === "faculty") {
            const offering = await CourseOffering.findById(courseOfferingId);
            if (!offering) {
                const err = new Error("Course offering not found");
                err.status = 404;
                throw err;
            }
            if (String(offering.facultyId) !== String(creatorId)) {
                const err = new Error("You are not assigned to this course offering");
                err.status = 403;
                throw err;
            }
        }
    }

    if (audience === "department" && !department?.trim()) {
        const err = new Error("department is required when audience is 'department'");
        err.status = 400;
        throw err;
    }

    // Faculty can only target: course, students, all (not faculty-only or department)
    if (role === "faculty" && (audience === "faculty" || audience === "department")) {
        const err = new Error("Faculty can only target 'course', 'students', or 'all'");
        err.status = 403;
        throw err;
    }

    return Announcement.create({
        title: title.trim(),
        body: body.trim(),
        category,
        audience,
        courseOfferingId: audience === "course" ? courseOfferingId : null,
        department: audience === "department" ? department.trim() : null,
        priority: priority || "normal",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: creatorId,
    });
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/**
 * Fetches announcements visible to the user, with optional filters and search.
 * Enriches each announcement with an isRead flag.
 */
export async function getAnnouncementsForUser(userId, role, department, filters = {}) {
    const visibilityFilter = await buildVisibilityFilter(userId, role, department);

    const query = { ...visibilityFilter };

    // Category filter
    if (filters.category) {
        query.category = filters.category;
    }

    // Priority filter
    if (filters.priority) {
        query.priority = filters.priority;
    }

    // Search (title or body)
    if (filters.search?.trim()) {
        const regex = new RegExp(filters.search.trim(), "i");
        query.$and = [
            ...(query.$and || []),
            { $or: [{ title: regex }, { body: regex }] },
        ];
    }

    const page = Math.max(1, parseInt(filters.page || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(filters.limit || "20", 10)));
    const skip = (page - 1) * limit;

    const [announcements, total] = await Promise.all([
        Announcement.find(query)
            .sort({ priority: -1, createdAt: -1 }) // urgent first, then newest
            .skip(skip)
            .limit(limit)
            .populate("createdBy", "name role department")
            .populate("courseOfferingId", "courseId semester year section")
            .lean(),
        Announcement.countDocuments(query),
    ]);

    // Attach read status
    const ids = announcements.map((a) => a._id);
    const readReceipts = await AnnouncementRead.find({
        userId,
        announcementId: { $in: ids },
    })
        .select("announcementId")
        .lean();
    const readSet = new Set(readReceipts.map((r) => String(r.announcementId)));

    const enriched = announcements.map((a) => ({
        ...a,
        isRead: readSet.has(String(a._id)),
    }));

    return { announcements: enriched, total, page, limit };
}

/**
 * Returns unread announcement count for the user.
 */
export async function getUnreadCount(userId, role, department) {
    const visibilityFilter = await buildVisibilityFilter(userId, role, department);

    const total = await Announcement.countDocuments(visibilityFilter);
    const readCount = await AnnouncementRead.countDocuments({
        userId,
        announcementId: {
            $in: await Announcement.find(visibilityFilter).select("_id").lean().then((docs) => docs.map((d) => d._id)),
        },
    });

    return Math.max(0, total - readCount);
}

// ─── READ RECEIPTS ────────────────────────────────────────────────────────────

/**
 * Marks a single announcement as read for the user (idempotent upsert).
 */
export async function markAsRead(userId, announcementId) {
    await AnnouncementRead.updateOne(
        { userId, announcementId },
        { $setOnInsert: { userId, announcementId } },
        { upsert: true }
    );
}

/**
 * Marks all currently visible announcements as read for the user.
 */
export async function markAllReadForUser(userId, role, department) {
    const visibilityFilter = await buildVisibilityFilter(userId, role, department);
    const announcements = await Announcement.find(visibilityFilter).select("_id").lean();

    if (announcements.length === 0) return;

    const ops = announcements.map((a) => ({
        updateOne: {
            filter: { userId, announcementId: a._id },
            update: { $setOnInsert: { userId, announcementId: a._id } },
            upsert: true,
        },
    }));

    await AnnouncementRead.bulkWrite(ops, { ordered: false });
}

// ─── UPDATE / DELETE ──────────────────────────────────────────────────────────

/**
 * Updates an announcement. Only the creator or an admin may update.
 */
export async function updateAnnouncement(userId, role, announcementId, data) {
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
        const err = new Error("Announcement not found");
        err.status = 404;
        throw err;
    }
    if (role !== "admin" && String(announcement.createdBy) !== String(userId)) {
        const err = new Error("You are not authorized to edit this announcement");
        err.status = 403;
        throw err;
    }

    const allowed = ["title", "body", "priority", "expiresAt"];
    const updates = {};
    for (const key of allowed) {
        if (data[key] !== undefined) updates[key] = data[key];
    }

    return Announcement.findByIdAndUpdate(announcementId, updates, { new: true });
}

/**
 * Deletes an announcement. Only the creator or an admin may delete.
 */
export async function deleteAnnouncement(userId, role, announcementId) {
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
        const err = new Error("Announcement not found");
        err.status = 404;
        throw err;
    }
    if (role !== "admin" && String(announcement.createdBy) !== String(userId)) {
        const err = new Error("You are not authorized to delete this announcement");
        err.status = 403;
        throw err;
    }

    await AnnouncementRead.deleteMany({ announcementId });
    await Announcement.findByIdAndDelete(announcementId);
}
