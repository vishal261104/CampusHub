import mongoose from "mongoose";
import Enrollment from "./enrollment.model.js";
import CourseOffering from "../courses/courseOffering.model.js";
import SemesterConfig from "../core/semesterConfig.model.js";
import StudentFeeRecord from "../fees/studentFeeRecord.model.js";

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const VALID_SEMESTERS = ["Spring", "Summer", "Fall", "Winter"];


function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value));
}


function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
}


/**
 * Submits a request for a student to enroll in a specific course offering.
 * Validates semester matching, fee payment status, enrollment periods, and capacity.
 * Creates a "Pending_Enroll" request that an admin must approve.
 * @param {String} studentId - ID of the requesting student
 * @param {String} offeringId - ID of the course offering
 */
export async function enrollInCourse(studentId, offeringId) {
  if (!studentId) {
    const err = new Error("Not authorized");
    err.status = 401;
    throw err;
  }
  if (!isValidObjectId(offeringId)) {
    const err = new Error("Invalid offering id");
    err.status = 400;
    throw err;
  }

  const offering = await CourseOffering.findById(offeringId);
  if (!offering) {
    const err = new Error("Course offering not found");
    err.status = 404;
    throw err;
  }
  if (offering.status !== "Open") {
    const err = new Error("Course offering is closed for enrollment");
    err.status = 400;
    throw err;
  }

  const activeSemester = await SemesterConfig.findOne({ isActive: true });
  if (!activeSemester) {
    const err = new Error("Enrollment is disabled: No active semester configured");
    err.status = 400;
    throw err;
  }

  if (offering.semester !== activeSemester.semester || offering.year !== activeSemester.year) {
    const err = new Error(`Cannot enroll: This course is for ${offering.semester} ${offering.year}, but the active semester is ${activeSemester.semester} ${activeSemester.year}`);
    err.status = 400;
    throw err;
  }

  
  const feeRecord = await StudentFeeRecord.findOne({
    studentId,
    semester: activeSemester.semester,
    year: activeSemester.year,
  });

  if (!feeRecord || feeRecord.status !== "Paid") {
    const err = new Error(`Cannot enroll: You must pay the total fee for the ${activeSemester.semester} ${activeSemester.year} semester first.`);
    err.status = 403;
    throw err;
  }
  

  const now = new Date();
  if (now < offering.enrollStarts || now > offering.enrollEnds) {
    const err = new Error("Enrollment period is closed");
    err.status = 400;
    throw err;
  }
  if (offering.enrolledCount >= offering.capacity) {
    const err = new Error("Course offering is full");
    err.status = 400;
    throw err;
  }

  const existingEnrollment = await Enrollment.findOne({
    studentId,
    courseOfferingId: offering._id,
  });

  if (existingEnrollment?.status === "Enrolled") {
    const err = new Error("Student is already enrolled in this course offering");
    err.status = 409;
    throw err;
  }

  let enrollment = existingEnrollment;
  if (enrollment?.status === "Dropped" || enrollment?.status === "Rejected") {
    enrollment.status = "Pending_Enroll";
    enrollment.droppedAt = null;
    enrollment.enrollmentDate = now;
    await enrollment.save();
  } else if (!enrollment) {
    enrollment = new Enrollment({
      studentId,
      courseOfferingId: offering._id,
      status: "Pending_Enroll"
    });
    await enrollment.save();
  }

  const populated = await Enrollment.findById(enrollment._id).populate({
    path: "courseOfferingId",
    populate: [
      { path: "courseId", model: "Course", select: "courseCode courseTitle credits department" },
      { path: "facultyId", model: "User", select: "name email role" },
    ],
  });

  return populated;
}


/**
 * Submits a request for a student to drop an active course enrollment.
 * Creates a "Pending_Drop" request that an admin must approve.
 * @param {String} studentId - ID of the requesting student
 * @param {String} offeringId - ID of the course offering
 */
export async function dropCourse(studentId, offeringId) {
  if (!studentId) {
    const err = new Error("Not authorized");
    err.status = 401;
    throw err;
  }
  if (!isValidObjectId(offeringId)) {
    const err = new Error("Invalid offering id");
    err.status = 400;
    throw err;
  }

  const offering = await CourseOffering.findById(offeringId);
  if (!offering) {
    const err = new Error("Course offering not found");
    err.status = 404;
    throw err;
  }

  const enrollment = await Enrollment.findOne({
    studentId,
    courseOfferingId: offering._id,
  });
  if (!enrollment || enrollment.status === "Dropped" || enrollment.status === "Pending_Drop") {
    const err = new Error("Student is not enrolled or drop is already pending");
    err.status = 400;
    throw err;
  }

  enrollment.status = "Pending_Drop";
  await enrollment.save();
}


/**
 * Retrieves all course enrollments for a specific student.
 * Supports filtering by status, semester, and year, along with pagination.
 * @param {String} studentId - ID of the student
 * @param {Object} query - Filtering params (status, semester, year, page, limit)
 */
export async function getEnrollments(studentId, query) {
  if (!studentId) {
    const err = new Error("Not authorized");
    err.status = 401;
    throw err;
  }

  const filter = { studentId };
  const status = query.status;
  if (status) {
    const statuses = status.split(',');
    const allowed = ["Pending_Enroll", "Enrolled", "Pending_Drop", "Dropped", "Rejected"];
    if (!statuses.every(s => allowed.includes(s))) {
      const err = new Error("Invalid status filter");
      err.status = 400;
      throw err;
    }
    filter.status = { $in: statuses };
  }

  let semester = query.semester;
  let year = query.year;

  if (!semester && year === undefined) {
    const activeSemester = await SemesterConfig.findOne({ isActive: true });
    if (activeSemester) {
      semester = activeSemester.semester;
      year = activeSemester.year;
    }
  }

  if (year !== undefined && (Number.isNaN(Number(year)) || Number(year) < 2000 || Number(year) > 2100)) {
    const err = new Error("Invalid year filter");
    err.status = 400;
    throw err;
  }

  const page = Math.max(1, Number.parseInt(String(query.page || "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(query.limit || "20"), 10) || 20));
  const skip = (page - 1) * limit;

  const enrollments = await Enrollment.find(filter)
    .populate({
      path: "courseOfferingId",
      match: {
        ...(semester ? { semester } : {}),
        ...(year ? { year: Number(year) } : {}),
      },
      populate: [
        { path: "courseId", model: "Course", select: "courseCode courseTitle credits department" },
        { path: "facultyId", model: "User", select: "name email role" },
      ],
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const filtered = enrollments.filter((row) => row.courseOfferingId);
  return { count: filtered.length, page, limit, enrollments: filtered };
}


/**
 * Generates a weekly timetable for a student based on their active "Enrolled" courses.
 * Groups classes by day of the week, sorts them by time, and detects scheduling conflicts.
 * @param {String} studentId - ID of the student
 * @param {Object} query - Filtering params (semester, year)
 */
export async function getStudentTimetable(studentId, query) {
  if (!studentId) {
    const err = new Error("Not authorized");
    err.status = 401;
    throw err;
  }

  let semester = query.semester;
  let year = query.year !== undefined ? Number(query.year) : undefined;

  if (!semester && year === undefined) {
    const activeSemester = await SemesterConfig.findOne({ isActive: true });
    if (activeSemester) {
      semester = activeSemester.semester;
      year = activeSemester.year;
    }
  }

  if (semester && !VALID_SEMESTERS.includes(semester)) {
    const err = new Error("Invalid semester filter");
    err.status = 400;
    throw err;
  }
  if (year !== undefined && (Number.isNaN(year) || year < 2000 || year > 2100)) {
    const err = new Error("Invalid year filter");
    err.status = 400;
    throw err;
  }

  const enrollments = await Enrollment.find({ studentId, status: "Enrolled" })
    .populate({
      path: "courseOfferingId",
      match: {
        ...(semester ? { semester } : {}),
        ...(year !== undefined ? { year } : {}),
      },
      populate: [
        { path: "courseId", model: "Course", select: "courseCode courseTitle credits department" },
        { path: "facultyId", model: "User", select: "name email role" },
      ],
    })
    .lean();

  const activeOfferings = enrollments.map((entry) => entry.courseOfferingId).filter(Boolean);

  const weekly = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] };
  const courses = [];
  const conflicts = [];

  for (const offering of activeOfferings) {
    const course = offering.courseId || {};
    const faculty = offering.facultyId || {};

    courses.push({
      offeringId: offering._id,
      courseCode: course.courseCode,
      courseTitle: course.courseTitle,
      credits: course.credits,
      department: course.department,
      section: offering.section,
      semester: offering.semester,
      year: offering.year,
      facultyName: faculty.name,
      facultyEmail: faculty.email,
    });

    for (const meeting of offering.meetings || []) {
      if (!weekly[meeting.day]) continue;
      weekly[meeting.day].push({
        offeringId: offering._id,
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        section: offering.section,
        facultyName: faculty.name,
        building: meeting.building,
        room: meeting.room,
        day: meeting.day,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
      });
    }
  }

  for (const day of DAY_ORDER) {
    weekly[day].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    for (let index = 0; index < weekly[day].length - 1; index += 1) {
      const current = weekly[day][index];
      const next = weekly[day][index + 1];
      if (timeToMinutes(next.startTime) < timeToMinutes(current.endTime)) {
        conflicts.push({ day, first: current, second: next });
      }
    }
  }

  const totalClassBlocks = DAY_ORDER.reduce((sum, day) => sum + weekly[day].length, 0);

  return {
    filters: { semester: semester || null, year: year ?? null },
    totalCourses: courses.length,
    totalClassBlocks,
    courses,
    weekly,
    conflicts,
  };
}


/**
 * Retrieves all pending enrollment and drop requests for admins to review.
 * Automatically detects and flags scheduling conflicts (time clashes) between the
 * requested course and the student's already approved active enrollments.
 * @param {Object} query - Filtering params (status)
 */
export async function getAdminRequests(query) {
  let statusFilter = { $in: ["Pending_Enroll", "Pending_Drop"] };
  if (query.status) {
    statusFilter = { $in: query.status.split(',') };
  }

  const requests = await Enrollment.find({ status: statusFilter })
    .populate("studentId", "name email studentId")
    .populate({
      path: "courseOfferingId",
      populate: [
        { path: "courseId", model: "Course", select: "courseCode courseTitle credits" },
        { path: "facultyId", model: "User", select: "name" },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();

  const studentIds = [...new Set(requests.map((r) => String(r.studentId?._id)).filter(Boolean))];
  const enrolledCourses = await Enrollment.find({
    studentId: { $in: studentIds },
    status: "Enrolled",
  }).populate("courseOfferingId").lean();

  const result = requests.map((reqRow) => {
    let hasClash = false;
    const conflicts = [];
    const offering = reqRow.courseOfferingId;
    if (reqRow.status === "Pending_Enroll" && offering && offering.meetings && offering.meetings.length > 0) {
      const studentActive = enrolledCourses.filter(
        (e) => String(e.studentId) === String(reqRow.studentId._id) && String(e.courseOfferingId._id) !== String(offering._id)
      );

      for (const meeting of offering.meetings) {
        const mStart = timeToMinutes(meeting.startTime);
        const mEnd = timeToMinutes(meeting.endTime);
        for (const active of studentActive) {
          const actOffering = active.courseOfferingId;
          if (actOffering && actOffering.meetings) {
            for (const actMeeting of actOffering.meetings) {
              if (actMeeting.day === meeting.day) {
                const aStart = timeToMinutes(actMeeting.startTime);
                const aEnd = timeToMinutes(actMeeting.endTime);
                if (mStart < aEnd && aStart < mEnd) {
                  hasClash = true;
                  conflicts.push({ day: meeting.day, time: `${meeting.startTime}-${meeting.endTime}` });
                }
              }
            }
          }
        }
      }
    }
    return { ...reqRow, hasClash, conflicts };
  });

  return result;
}


/**
 * Processes an admin's decision (approve or reject) on a pending enrollment or drop request.
 * Adjusts the course offering's `enrolledCount` automatically upon approval.
 * @param {String} enrollmentId - ID of the enrollment request document
 * @param {String} action - The decision ("approve" or "reject")
 */
export async function updateRequestStatus(enrollmentId, action) {
  const enrollment = await Enrollment.findById(enrollmentId).populate("courseOfferingId");
  if (!enrollment) {
    const err = new Error("Request not found");
    err.status = 404;
    throw err;
  }

  if (!["Pending_Enroll", "Pending_Drop"].includes(enrollment.status)) {
    const err = new Error(`Request is not pending (current status: ${enrollment.status})`);
    err.status = 400;
    throw err;
  }

  const offering = enrollment.courseOfferingId;

  if (action === "approve") {
    if (enrollment.status === "Pending_Enroll") {
      enrollment.status = "Enrolled";
      if (offering) {
        offering.enrolledCount += 1;
        await offering.save();
      }
    } else if (enrollment.status === "Pending_Drop") {
      enrollment.status = "Dropped";
      enrollment.droppedAt = new Date();
      if (offering) {
        offering.enrolledCount = Math.max(0, Number(offering.enrolledCount || 0) - 1);
        await offering.save();
      }
    }
  } else if (action === "reject") {
    if (enrollment.status === "Pending_Enroll") {
      enrollment.status = "Rejected";
    } else if (enrollment.status === "Pending_Drop") {
      enrollment.status = "Enrolled";
    }
  } else {
    const err = new Error("Invalid action. Use 'approve' or 'reject'.");
    err.status = 400;
    throw err;
  }

  await enrollment.save();
  return enrollment;
}
