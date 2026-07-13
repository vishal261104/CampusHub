import CourseOffering from "../courses/courseOffering.model.js";
import Attendance from "./attendance.model.js";
import Enrollment from "../enrollments/enrollment.model.js";

/**
 * Retrieves a list of students currently enrolled in a specific course offering.
 * Filters out students who have dropped the course.
 * @param {String} courseOfferingId - The ID of the course offering
 * @returns {Array} List of populated student objects containing name and email
 */
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

/**
 * Records a single student's attendance (Present/Absent/Late) for a specific date in a course offering.
 * Ensures the requesting faculty is the one assigned to the course and that the student is actually enrolled.
 * Prevents duplicate attendance records for the same student on the same date.
 * @param {String} facultyId - ID of the faculty attempting to mark attendance
 * @param {Object} data - Contains courseOfferingId, studentId, status, and date
 */
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

/**
 * Calculates and returns aggregated attendance statistics for a specific student across all their courses.
 * Groups records by course offering and computes the attendance percentage.
 * @param {String} studentId - The ID of the student
 * @returns {Array} List of course attendance summaries including total classes, present classes, and percentage
 */
export async function getAttendance(studentId) {
  const records = await Attendance.find({ studentId }).populate({
    path: "courseOfferingId",
    populate: { path: "courseId" }
  });

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

/**
 * Retrieves all raw attendance records for a specific course offering.
 * Ensures that only the faculty assigned to the course can view these records.
 * @param {String} facultyId - The ID of the requesting faculty
 * @param {String} courseOfferingId - The ID of the course offering
 * @returns {Array} List of populated attendance records containing student details
 */
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
