import mongoose from "mongoose";
import Enrollment from "../models/Enrollment.js";
import CourseOffering from "../models/CourseOffering.js";

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value));
}

export async function enrollInCourse(req, res) {
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
    return res.status(500).json({ message: err.message || "Server error" });
  }
}
export async function dropCourse(req, res) {
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
    return res.status(500).json({ message: err.message || "Server error" });
  }
}
export async function getEnrollments(req, res) {
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
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

