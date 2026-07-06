import * as complaintService from "./hostelComplaint.service.js";

/**
 * Controller for a student to raise a new complaint about their hostel room.
 * Route: POST /api/hostel-complaints/
 * Access: Student
 */
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

/**
 * Controller for a student to view their own history of raised complaints.
 * Route: GET /api/hostel-complaints/my-complaints
 * Access: Student
 */
export const getMyComplaints = async (req, res, next) => {
    try {
        const studentId = req.userDoc._id;
        const complaints = await complaintService.getMyComplaints(studentId);
        return res.status(200).json({ count: complaints.length, complaints });
    } catch (err) {
        next(err);
    }
};

/**
 * Controller for an admin to view all complaints, with optional filtering.
 * Route: GET /api/hostel-complaints/
 * Access: Admin
 */
export const getAllComplaints = async (req, res, next) => {
    try {
        const complaints = await complaintService.getAllComplaints(req.query);
        return res.status(200).json({ count: complaints.length, complaints });
    } catch (err) {
        next(err);
    }
};

/**
 * Controller to update the status of a complaint (e.g. Open -> In Progress -> Resolved).
 * Students can only mark as 'Resolved'. Admins manage 'Open' and 'In Progress'.
 * Route: PATCH /api/hostel-complaints/:id/status
 * Access: Authenticated Users (Student/Admin)
 */
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

/**
 * Controller for an admin to assign a complaint to a specific staff/maintenance person.
 * Route: PATCH /api/hostel-complaints/:id/assign
 * Access: Admin
 */
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

/**
 * Controller to add a text comment to a complaint.
 * Students can only comment on their own complaints.
 * Route: POST /api/hostel-complaints/:id/comments
 * Access: Authenticated Users (Student/Admin)
 */
export const addComment = async (req, res, next) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) {
            return res.status(400).json({ message: "Comment text is required" });
        }

        const complaintId = req.params.id;

        
        if (req.user.role === "student") {
            const { getMyComplaints } = await import("./hostelComplaint.service.js");
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
