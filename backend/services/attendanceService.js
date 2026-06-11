import CourseOffering from "../models/CourseOffering.js";
import Attendance from "../models/Attendance.js";
import Enrollment from "../models/Enrollment.js";

// Retrieves students enrolled in a specific course offering.
export async function getEnrolledStudents(courseOfferingId) {
  const offering = await CourseOffering.findById(courseOfferingId).select("_id");
  if (!offering) {
    const err = new Error("Course Offering not found");
    err.status = 404;
    throw err;
  }

  const enrollments = await Enrollment.find({
    courseOfferingId: offering._id,
    status: "Enrolled",
  })
    .populate("studentId", "name email")
    .lean();

  return enrollments.map((enrollment) => enrollment.studentId).filter(Boolean);
}

// Marks attendance for a student in a course offering, restricted to the assigned faculty.
export async function markAttendance(facultyId, { courseOfferingId, studentId, status, date }) {
  const offering = await CourseOffering.findById(courseOfferingId);
  if (!offering) {
    const err = new Error("Course Offering not found");
    err.status = 404;
    throw err;
  }
  if (offering.facultyId.toString() !== facultyId) {
    const err = new Error("Faculty not authorized to take attendance");
    err.status = 403;
    throw err;
  }

  const enrollment = await Enrollment.findOne({ studentId, courseOfferingId });
  if (!enrollment || enrollment.status === "Dropped") {
    const err = new Error("Student is not enrolled in this course");
    err.status = 400;
    throw err;
  }

  const existingAttendance = await Attendance.findOne({ courseOfferingId, studentId, date });
  if (existingAttendance) {
    const err = new Error("Attendance already marked for this date");
    err.status = 400;
    throw err;
  }

  const attendance = await Attendance.create({ courseOfferingId, studentId, status, date });
  return attendance;
}

// Retrieves and aggregates attendance history/percentage for a student across all courses.
export async function getAttendance(studentId) {
  const records = await Attendance.find({ studentId }).populate("courseOfferingId");

  const attendanceMap = {};
  for (const record of records) {
    const offeringId = record.courseOfferingId._id.toString();
    if (!attendanceMap[offeringId]) {
      attendanceMap[offeringId] = {
        courseOffering: record.courseOfferingId,
        totalClasses: 0,
        presentClasses: 0,
      };
    }
    attendanceMap[offeringId].totalClasses++;
    if (record.status === "Present") {
      attendanceMap[offeringId].presentClasses++;
    }
  }

  return Object.values(attendanceMap).map(item => ({
    ...item,
    percentage: (item.presentClasses / item.totalClasses) * 100,
  }));
}

// Retrieves all attendance records for a course offering, restricted to assigned faculty.
export async function getCourseAttendance(facultyId, courseOfferingId) {
  const offering = await CourseOffering.findById(courseOfferingId);
  if (!offering) {
    const err = new Error("Course Offering not found");
    err.status = 404;
    throw err;
  }
  if (offering.facultyId.toString() !== facultyId) {
    const err = new Error("Faculty not authorized to view attendance");
    err.status = 403;
    throw err;
  }

  return Attendance.find({ courseOfferingId }).populate("studentId", "name rollNumber");
}
