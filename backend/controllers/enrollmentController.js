import mongoose from "mongoose";
import Enrollment from "../models/Enrollment.js";
import CourseOffering from "../models/CourseOffering.js";

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value));
}

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const VALID_SEMESTERS = ["Spring", "Summer", "Fall", "Winter"];

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
}

export async function enrollInCourse(req, res, next) {
  try {
    const offeringId = req.params.id;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (!isValidObjectId(offeringId)) {
      return res.status(400).json({ message: "Invalid offering id" });
    }

    const offering = await CourseOffering.findById(offeringId);
    if (!offering) {
      return res.status(404).json({ message: "Course offering not found" });
    }
    if (offering.status !== "Open") {
      return res
        .status(400)
        .json({ message: "Course offering is closed for enrollment" });
    }

    const now = new Date();
    if (
      now < offering.enrollStarts ||
      now > offering.enrollEnds
    ) {
      return res.status(400).json({ message: "Enrollment period is closed" });
    }
    if (offering.enrolledCount >= offering.capacity) {
      return res.status(400).json({ message: "Course offering is full" });
    }
    const existingEnrollment = await Enrollment.findOne({
      studentId,
      courseOfferingId: offering._id,
    });

    if (existingEnrollment?.status === "Enrolled") {
      return res
        .status(409)
        .json({
          message: "Student is already enrolled in this course offering",
        });
    }

    let enrollment = existingEnrollment;
    if (enrollment?.status === "Dropped") {
      enrollment.status = "Enrolled";
      enrollment.droppedAt = null;
      enrollment.enrollmentDate = now;
      await enrollment.save();
    } else if (!enrollment) {
      enrollment = new Enrollment({
        studentId,
        courseOfferingId: offering._id,
      });
      await enrollment.save();
    }

    offering.enrolledCount += 1;
    await offering.save();

    const populated = await Enrollment.findById(enrollment._id).populate({
      path: "courseOfferingId",
      populate: [
        { path: "courseId", model: "Course", select: "courseCode courseTitle credits department" },
        { path: "facultyId", model: "User", select: "name email role" },
      ],
    });

    return res
      .status(201)
      .json({ message: "Enrollment successful", enrollment: populated });
  } catch (err) {
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({
          message: "Student is already enrolled in this course offering",
        });
    }
    return next(err);
  }
}
export async function dropCourse(req, res, next) {
  try {
    const offeringId = req.params.id;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (!isValidObjectId(offeringId)) {
      return res.status(400).json({ message: "Invalid offering id" });
    }

    const offering = await CourseOffering.findById(offeringId);
    if (!offering) {
      return res.status(404).json({ message: "Course offering not found" });
    }
    const enrollment = await Enrollment.findOne({
      studentId,
      courseOfferingId: offering._id,
    });
    if (!enrollment || enrollment.status === "Dropped") {
      return res
        .status(400)
        .json({ message: "Student is not enrolled in this course offering" });
    }
    enrollment.status = "Dropped";
    enrollment.droppedAt = new Date();
    await enrollment.save();

    offering.enrolledCount = Math.max(0, Number(offering.enrolledCount || 0) - 1);
    await offering.save();

    return res.status(200).json({ message: "Course dropped successfully" });
  } catch (err) {
    return next(err);
  }
}
export async function getEnrollments(req, res, next) {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const filter = { studentId };
    const status = req.query.status;
    if (status) {
      if (!["Enrolled", "Dropped"].includes(status)) {
        return res.status(400).json({ message: "Invalid status filter" });
      }
      filter.status = status;
    }

    const semester = req.query.semester;
    const year = req.query.year;
    if (year !== undefined && (Number.isNaN(Number(year)) || Number(year) < 2000 || Number(year) > 2100)) {
      return res.status(400).json({ message: "Invalid year filter" });
    }

    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || "20"), 10) || 20));
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

    return res.status(200).json({
      count: filtered.length,
      page,
      limit,
      enrollments: filtered,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getStudentTimetable(req, res, next) {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const semester = req.query.semester;
    const year = req.query.year !== undefined ? Number(req.query.year) : undefined;

    if (semester && !VALID_SEMESTERS.includes(semester)) {
      return res.status(400).json({ message: "Invalid semester filter" });
    }

    if (year !== undefined && (Number.isNaN(year) || year < 2000 || year > 2100)) {
      return res.status(400).json({ message: "Invalid year filter" });
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

    const activeOfferings = enrollments
      .map((entry) => entry.courseOfferingId)
      .filter(Boolean);

    const weekly = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
    };

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
        if (!weekly[meeting.day]) {
          continue;
        }

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
          conflicts.push({
            day,
            first: current,
            second: next,
          });
        }
      }
    }

    const totalClassBlocks = DAY_ORDER.reduce((sum, day) => sum + weekly[day].length, 0);

    return res.status(200).json({
      filters: {
        semester: semester || null,
        year: year ?? null,
      },
      totalCourses: courses.length,
      totalClassBlocks,
      courses,
      weekly,
      conflicts,
    });
  }
  catch (err) {
    return next(err);
  }
}