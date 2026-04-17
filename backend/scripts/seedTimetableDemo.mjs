import mongoose from "mongoose";
import dotenv from "dotenv";

import Course from "../models/Course.js";
import CourseOffering from "../models/CourseOffering.js";
import Enrollment from "../models/Enrollment.js";
import User from "../models/User.js";

dotenv.config();

const TARGET_STUDENT_COUNT = 30;
const DEMO_PASSWORD = "Student@123";

const EXTRA_COURSES = [
  {
    courseCode: "CS3001",
    courseTitle: "Database Systems",
    description: "Relational modeling, SQL, transactions, indexing.",
    credits: 3,
    department: "CSE",
  },
  {
    courseCode: "CS3002",
    courseTitle: "Operating Systems",
    description: "Processes, scheduling, memory, filesystems.",
    credits: 3,
    department: "CSE",
  },
  {
    courseCode: "CS3003",
    courseTitle: "Computer Networks",
    description: "Layered networks, routing, TCP/IP, congestion control.",
    credits: 3,
    department: "CSE",
  },
  {
    courseCode: "CS3004",
    courseTitle: "Software Engineering",
    description: "Lifecycle models, testing, quality, DevOps foundations.",
    credits: 3,
    department: "CSE",
  },
  {
    courseCode: "MA2301",
    courseTitle: "Probability and Statistics",
    description: "Probability theory, distributions, estimation, hypothesis testing.",
    credits: 3,
    department: "Mathematics",
  },
  {
    courseCode: "HS2101",
    courseTitle: "Professional Communication",
    description: "Technical communication, reports, and presentations.",
    credits: 2,
    department: "Humanities",
  },
];

const SLOT_BANK = [
  [
    { day: "Monday", startTime: "09:00", endTime: "10:00", building: "A-Block", room: "A-101" },
    { day: "Wednesday", startTime: "09:00", endTime: "10:00", building: "A-Block", room: "A-101" },
  ],
  [
    { day: "Tuesday", startTime: "09:00", endTime: "10:00", building: "A-Block", room: "A-103" },
    { day: "Thursday", startTime: "09:00", endTime: "10:00", building: "A-Block", room: "A-103" },
  ],
  [
    { day: "Monday", startTime: "10:00", endTime: "11:00", building: "B-Block", room: "B-205" },
    { day: "Wednesday", startTime: "10:00", endTime: "11:00", building: "B-Block", room: "B-205" },
  ],
  [
    { day: "Tuesday", startTime: "11:00", endTime: "12:00", building: "B-Block", room: "B-210" },
    { day: "Thursday", startTime: "11:00", endTime: "12:00", building: "B-Block", room: "B-210" },
  ],
  [
    { day: "Monday", startTime: "12:00", endTime: "13:00", building: "C-Block", room: "C-102" },
    { day: "Friday", startTime: "12:00", endTime: "13:00", building: "C-Block", room: "C-102" },
  ],
  [
    { day: "Tuesday", startTime: "14:00", endTime: "15:00", building: "C-Block", room: "C-203" },
    { day: "Thursday", startTime: "14:00", endTime: "15:00", building: "C-Block", room: "C-203" },
  ],
  [
    { day: "Wednesday", startTime: "15:00", endTime: "16:00", building: "D-Block", room: "D-301" },
    { day: "Friday", startTime: "15:00", endTime: "16:00", building: "D-Block", room: "D-301" },
  ],
  [
    { day: "Tuesday", startTime: "16:00", endTime: "17:00", building: "D-Block", room: "D-305" },
    { day: "Thursday", startTime: "16:00", endTime: "17:00", building: "D-Block", room: "D-305" },
  ],
  [
    { day: "Monday", startTime: "17:00", endTime: "18:00", building: "E-Block", room: "E-110" },
    { day: "Wednesday", startTime: "17:00", endTime: "18:00", building: "E-Block", room: "E-110" },
  ],
];

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function timeToMinutes(value) {
  const [h, m] = String(value).split(":").map(Number);
  return h * 60 + m;
}

function meetingsConflict(aMeetings, bMeetings) {
  for (const a of aMeetings) {
    for (const b of bMeetings) {
      if (a.day !== b.day) continue;
      const aStart = timeToMinutes(a.startTime);
      const aEnd = timeToMinutes(a.endTime);
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);
      if (aStart < bEnd && bStart < aEnd) {
        return true;
      }
    }
  }
  return false;
}

function pickTerm(existingOfferings) {
  if (!existingOfferings.length) {
    return { semester: "Spring", year: new Date().getFullYear() };
  }
  const counts = new Map();
  for (const off of existingOfferings) {
    const key = `${off.semester}-${off.year}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const [semester, yearRaw] = top.split("-");
  return { semester, year: Number(yearRaw) };
}

function sortMeetings(meetings) {
  return [...meetings].sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });
}

async function ensureExtraCourses() {
  const existingCodes = new Set((await Course.find({}, "courseCode").lean()).map((c) => c.courseCode));
  const toInsert = EXTRA_COURSES.filter((c) => !existingCodes.has(c.courseCode));
  if (toInsert.length) {
    await Course.insertMany(toInsert);
  }
  return toInsert.length;
}

async function ensureDemoStudents() {
  const existing = await User.find({ role: "student", email: { $regex: /^timetable\.student\d+@erp\.local$/ } }, "email").lean();
  const existingEmails = new Set(existing.map((u) => u.email));

  const toCreate = [];
  for (let i = 1; i <= TARGET_STUDENT_COUNT; i += 1) {
    const index = String(i).padStart(2, "0");
    const email = `timetable.student${index}@erp.local`;
    if (existingEmails.has(email)) continue;
    toCreate.push({
      name: `Timetable Student ${index}`,
      email,
      password: DEMO_PASSWORD,
      role: "student",
    });
  }

  if (toCreate.length) {
    await User.create(toCreate);
  }

  return User.find({ role: "student", email: { $regex: /^timetable\.student\d+@erp\.local$/ } }).lean();
}

async function ensureEnoughOfferings(term, faculties) {
  const current = await CourseOffering.find({ semester: term.semester, year: term.year }).lean();
  const existingCourseIds = new Set(current.map((o) => String(o.courseId)));

  const allCourses = await Course.find().sort({ courseCode: 1 }).lean();
  const candidates = allCourses.filter((c) => !existingCourseIds.has(String(c._id)));

  const targetOfferingCount = Math.max(12, current.length);
  const toCreateCount = Math.max(0, targetOfferingCount - current.length);

  const now = new Date();
  const enrollStarts = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const enrollEnds = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const toCreate = [];
  for (let i = 0; i < toCreateCount && i < candidates.length; i += 1) {
    const course = candidates[i];
    const faculty = faculties[i % faculties.length];
    const meetings = SLOT_BANK[(current.length + i) % SLOT_BANK.length];

    toCreate.push({
      courseId: course._id,
      semester: term.semester,
      year: term.year,
      facultyId: faculty._id,
      capacity: 50 + ((i % 4) * 10),
      enrolledCount: 0,
      section: "A",
      status: "Open",
      meetings,
      enrollStarts,
      enrollEnds,
    });
  }

  if (toCreate.length) {
    await CourseOffering.insertMany(toCreate, { ordered: false });
  }

  const updated = await CourseOffering.find({ semester: term.semester, year: term.year })
    .populate("courseId", "courseCode courseTitle")
    .populate("facultyId", "name email")
    .lean();

  return { before: current.length, added: toCreate.length, offerings: updated };
}

async function seedEnrollments(term, students, offerings) {
  const openOfferings = offerings.filter((o) => o.status === "Open");
  if (!openOfferings.length) {
    return { enrolledRows: 0, activeStudents: 0 };
  }

  const studentIds = students.map((s) => s._id);
  const offeringIds = openOfferings.map((o) => o._id);

  await Enrollment.deleteMany({
    studentId: { $in: studentIds },
    courseOfferingId: { $in: offeringIds },
  });

  const docs = [];
  for (let i = 0; i < students.length; i += 1) {
    const student = students[i];
    const desired = 4 + (i % 2);

    const selected = [];
    const rotated = [...openOfferings.slice(i % openOfferings.length), ...openOfferings.slice(0, i % openOfferings.length)];

    for (const off of rotated) {
      if (selected.length >= desired) break;
      const conflict = selected.some((s) => meetingsConflict(s.meetings, off.meetings));
      if (!conflict) selected.push(off);
    }

    for (const off of selected) {
      docs.push({
        studentId: student._id,
        courseOfferingId: off._id,
        status: "Enrolled",
        enrollmentDate: new Date(),
      });
    }
  }

  if (docs.length) {
    await Enrollment.insertMany(docs, { ordered: false });
  }

  const enrollmentCounts = await Enrollment.aggregate([
    { $match: { status: "Enrolled" } },
    { $group: { _id: "$courseOfferingId", count: { $sum: 1 } } },
  ]);

  const countMap = new Map(enrollmentCounts.map((x) => [String(x._id), x.count]));

  const bulkOps = offerings.map((off) => ({
    updateOne: {
      filter: { _id: off._id },
      update: { $set: { enrolledCount: countMap.get(String(off._id)) || 0 } },
    },
  }));

  if (bulkOps.length) {
    await CourseOffering.bulkWrite(bulkOps);
  }

  return {
    enrolledRows: docs.length,
    activeStudents: students.length,
  };
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existingOfferings = await CourseOffering.find({}, "semester year").lean();
  const term = pickTerm(existingOfferings);

  const [facultyUsers] = await Promise.all([
    User.find({ role: "faculty" }).sort({ createdAt: 1 }).lean(),
    ensureExtraCourses(),
  ]);

  if (!facultyUsers.length) {
    throw new Error("No faculty users found. Create faculty users before seeding timetable data.");
  }

  const students = await ensureDemoStudents();
  const offeringResult = await ensureEnoughOfferings(term, facultyUsers);
  const enrollmentResult = await seedEnrollments(term, students, offeringResult.offerings);

  const sampleStudent = students[0];
  const sampleRows = await Enrollment.find({ studentId: sampleStudent._id, status: "Enrolled" })
    .populate({
      path: "courseOfferingId",
      populate: [
        { path: "courseId", model: "Course", select: "courseCode courseTitle" },
        { path: "facultyId", model: "User", select: "name email" },
      ],
    })
    .lean();

  const compactSample = sampleRows.map((row) => ({
    courseCode: row.courseOfferingId?.courseId?.courseCode,
    courseTitle: row.courseOfferingId?.courseId?.courseTitle,
    faculty: row.courseOfferingId?.facultyId?.name,
    meetings: sortMeetings(row.courseOfferingId?.meetings || []),
  }));

  console.log("\nTimetable demo seed complete.");
  console.log(
    JSON.stringify(
      {
        term,
        studentsSeeded: students.length,
        offeringsBefore: offeringResult.before,
        offeringsAdded: offeringResult.added,
        offeringsNow: offeringResult.offerings.length,
        enrollmentsInserted: enrollmentResult.enrolledRows,
        sampleStudent: {
          name: sampleStudent.name,
          email: sampleStudent.email,
          password: DEMO_PASSWORD,
          timetableCourses: compactSample,
        },
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Seed failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
