import Complaint from "./complaint.model.js";
import RoomAllocation from "./roomAllocation.model.js";

// Creates a complaint for a student, deriving their roomId from their active allocation.
// Rejects if the student has no active room allocation.
export async function createComplaint(studentId, { title, description, category, priority }) {
    const allocation = await RoomAllocation.findOne({ studentId, isActive: true });
    if (!allocation) {
        const err = new Error("You must have an active room allocation to raise a complaint.");
        err.status = 403;
        throw err;
    }

    const complaint = await Complaint.create({
        studentId,
        roomId: allocation.roomId,
        title: title?.trim(),
        description: description?.trim(),
        category: category || "Other",
        priority: priority || "Medium",
    });

    return complaint;
}

// Returns all complaints raised by a specific student, newest first.
export async function getMyComplaints(studentId) {
    return Complaint.find({ studentId })
        .populate("roomId", "roomNumber hostelBlock hostelType floor")
        .sort({ createdAt: -1 });
}

// Returns all complaints for admin with optional filters: status, category, priority, roomId.
export async function getAllComplaints(query = {}) {
    const filter = {};
    if (query.status)   filter.status   = query.status;
    if (query.category) filter.category = query.category;
    if (query.priority) filter.priority = query.priority;
    if (query.roomId)   filter.roomId   = query.roomId;

    return Complaint.find(filter)
        .populate("studentId", "name email studentId")
        .populate("roomId", "roomNumber hostelBlock hostelType floor")
        .sort({ createdAt: -1 });
}

// Updates the status of a complaint with role-based rules:
// - hostelAdmin can set: Open → In Progress (never Resolved).
// - student can set: In Progress → Resolved (own complaints only).
export async function updateComplaintStatus(complaintId, status, callerRole, callerId) {
    const adminAllowed   = ["Open", "In Progress"];
    const studentAllowed = ["Resolved"];

    if (callerRole === "hostelAdmin" && !adminAllowed.includes(status)) {
        const err = new Error("Hostel admin can only set status to: Open, In Progress");
        err.status = 403;
        throw err;
    }
    if (callerRole === "student" && !studentAllowed.includes(status)) {
        const err = new Error("Students can only mark a complaint as Resolved");
        err.status = 403;
        throw err;
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
        const err = new Error("Complaint not found");
        err.status = 404;
        throw err;
    }

    // IDOR: students can only resolve their own complaints
    if (callerRole === "student" && complaint.studentId.toString() !== callerId.toString()) {
        const err = new Error("You can only resolve your own complaints");
        err.status = 403;
        throw err;
    }

    // Students can only resolve a complaint that is In Progress (admin has looked at it)
    if (callerRole === "student" && complaint.status !== "In Progress") {
        const err = new Error("You can only resolve a complaint that is In Progress");
        err.status = 400;
        throw err;
    }

    if (complaint.status === "Resolved") {
        const err = new Error("A resolved complaint cannot be changed.");
        err.status = 400;
        throw err;
    }

    complaint.status = status;
    if (status === "Resolved") complaint.resolvedAt = new Date();
    await complaint.save();
    return complaint;
}

// Sets or clears the assignedTo field for a complaint.
export async function assignComplaint(complaintId, assignedTo) {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
        const err = new Error("Complaint not found");
        err.status = 404;
        throw err;
    }
    complaint.assignedTo = assignedTo?.trim() || "";
    await complaint.save();
    return complaint;
}

// Appends a comment to a complaint from either a student or hostelAdmin.
// Students can only comment on their own complaints (ownership checked in controller).
export async function addComment(complaintId, authorId, authorRole, text) {
    const complaint = await Complaint.findById(complaintId)
        .populate("comments.authorId", "name role");
    if (!complaint) {
        const err = new Error("Complaint not found");
        err.status = 404;
        throw err;
    }

    complaint.comments.push({ authorId, authorRole, text: text?.trim() });
    await complaint.save();
    return complaint;
}