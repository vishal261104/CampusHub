import * as complaintService from "../services/hostelComplaintService.js";

// Handles HTTP request for a student to create a new hostel complaint.
export const createComplaint = async (req, res, next) => {
    try {
        const studentId = req.userDoc._id;
        const complaint = await complaintService.createComplaint(studentId, req.body);
        return res.status(201).json({ message: "Complaint submitted successfully", complaint });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// Handles HTTP request for a student to view their own complaints.
export const getMyComplaints = async (req, res, next) => {
    try {
        const studentId = req.userDoc._id;
        const complaints = await complaintService.getMyComplaints(studentId);
        return res.status(200).json({ count: complaints.length, complaints });
    } catch (err) {
        next(err);
    }
};

// Handles HTTP request for hostelAdmin to list all complaints with optional filters.
export const getAllComplaints = async (req, res, next) => {
    try {
        const complaints = await complaintService.getAllComplaints(req.query);
        return res.status(200).json({ count: complaints.length, complaints });
    } catch (err) {
        next(err);
    }
};

// Handles HTTP request to update a complaint's status.
// hostelAdmin can set Open/In Progress; students can mark their own as Resolved.
export const updateComplaintStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const callerRole = req.user.role;
        const callerId   = req.userDoc._id;
        const complaint = await complaintService.updateComplaintStatus(req.params.id, status, callerRole, callerId);
        return res.status(200).json({ message: `Complaint marked as ${status}`, complaint });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// Handles HTTP request for hostelAdmin to assign a complaint to maintenance staff.
export const assignComplaint = async (req, res, next) => {
    try {
        const { assignedTo } = req.body;
        const complaint = await complaintService.assignComplaint(req.params.id, assignedTo);
        return res.status(200).json({ message: "Complaint assigned", complaint });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// Handles HTTP request for students or hostelAdmin to add a comment to a complaint.
// Students can only comment on their own complaints.
export const addComment = async (req, res, next) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) {
            return res.status(400).json({ message: "Comment text is required" });
        }

        const complaintId = req.params.id;

        // IDOR guard: students can only comment on their own complaints
        if (req.user.role === "student") {
            const { getMyComplaints } = await import("../services/hostelComplaintService.js");
            const mine = await getMyComplaints(req.userDoc._id);
            const owns = mine.some(c => c._id.toString() === complaintId);
            if (!owns) {
                return res.status(403).json({ message: "You can only comment on your own complaints" });
            }
        }

        const authorRole = req.user.role === "student" ? "student" : "hostelAdmin";
        const complaint = await complaintService.addComment(complaintId, req.userDoc._id, authorRole, text);
        return res.status(200).json({ message: "Comment added", complaint });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};
