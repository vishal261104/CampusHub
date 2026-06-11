import CourseOffering from "../models/CourseOffering.js";
import User from "../models/User.js";
import Course from "../models/Course.js";

// Safely parses a value into an integer, falling back to a default value if invalid.
function toInt(value, fallback) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

// Converts an HH:MM time string to the number of minutes since midnight.
function timeToMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map((x) => Number.parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

// Validates that an array of meeting slots has correct time formats and order.
function validateMeetings(meetings) {
  if (!Array.isArray(meetings) || meetings.length === 0) {
    return { ok: false, message: 'meetings must be a non-empty array' };
  }
  for (const meeting of meetings) {
    const start = timeToMinutes(meeting?.startTime);
    const end = timeToMinutes(meeting?.endTime);
    if (start === null || end === null) {
      return { ok: false, message: 'meeting startTime/endTime must be HH:MM' };
    }
    if (end <= start) {
      return { ok: false, message: 'meeting endTime must be after startTime' };
    }
  }
  return { ok: true };
}

// Safely parses a value into a Date object or returns null if invalid.
function parseDateOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Resolves a faculty database ID from either facultyId or facultyEmail.
async function resolveFacultyId({ facultyId, facultyEmail }) {
  if (facultyId) {
    const faculty = await User.findById(facultyId);
    if (!faculty || faculty.role !== 'faculty') {
      const err = new Error('Invalid faculty member');
      err.status = 400;
      throw err;
    }
    return faculty._id;
  }
  if (facultyEmail) {
    const normalizedEmail = String(facultyEmail).trim().toLowerCase();
    const faculty = await User.findOne({ email: normalizedEmail });
    if (!faculty || faculty.role !== 'faculty') {
      const err = new Error('Invalid faculty member');
      err.status = 400;
      throw err;
    }
    return faculty._id;
  }
  const err = new Error('facultyId or facultyEmail is required');
  err.status = 400;
  throw err;
}

// Resolves a course database ID from either courseId or courseCode.
async function resolveCourseId({ courseId, courseCode }) {
  if (courseId) {
    const course = await Course.findById(courseId);
    if (!course) {
      const err = new Error('Invalid courseId');
      err.status = 400;
      throw err;
    }
    return course._id;
  }
  if (courseCode) {
    const normalizedCode = String(courseCode).trim();
    const course = await Course.findOne({ courseCode: normalizedCode });
    if (!course) {
      const err = new Error('Invalid courseCode');
      err.status = 400;
      throw err;
    }
    return course._id;
  }
  const err = new Error('courseId or courseCode is required');
  err.status = 400;
  throw err;
}

// Creates a new course offering with full validation.
export async function createOffering(body) {
  const { courseId, courseCode, semester, year, facultyId, facultyEmail, capacity, section, status, meetings, enrollStarts, enrollEnds } = body;

  if (!semester || !year) {
    const err = new Error('semester and year are required');
    err.status = 400;
    throw err;
  }

  const resolvedCourseId = await resolveCourseId({ courseId, courseCode });
  const resolvedFacultyId = await resolveFacultyId({ facultyId, facultyEmail });

  if (!["Spring", "Summer", "Fall", "Winter"].includes(semester)) {
    const err = new Error('Invalid semester');
    err.status = 400;
    throw err;
  }
  if (isNaN(year) || year < 2000 || year > 2100) {
    const err = new Error('Invalid year');
    err.status = 400;
    throw err;
  }
  if (capacity === undefined || isNaN(capacity) || Number(capacity) < 1) {
    const err = new Error('capacity must be at least 1');
    err.status = 400;
    throw err;
  }
  if (status !== undefined && !["Open", "Closed"].includes(status)) {
    const err = new Error('Invalid status');
    err.status = 400;
    throw err;
  }

  const start = parseDateOrNull(enrollStarts);
  const end = parseDateOrNull(enrollEnds);
  if (!start || !end) {
    const err = new Error('enrollStarts and enrollEnds are required and must be valid dates');
    err.status = 400;
    throw err;
  }
  if (end <= start) {
    const err = new Error('enrollEnds must be after enrollStarts');
    err.status = 400;
    throw err;
  }

  const meetingsCheck = validateMeetings(meetings);
  if (!meetingsCheck.ok) {
    const err = new Error(meetingsCheck.message);
    err.status = 400;
    throw err;
  }

  const offering = new CourseOffering({
    courseId: resolvedCourseId,
    semester,
    year,
    facultyId: resolvedFacultyId,
    capacity,
    ...(section !== undefined ? { section } : {}),
    ...(status !== undefined ? { status } : {}),
    meetings,
    enrollStarts: start,
    enrollEnds: end,
  });
  await offering.save();
  return offering;
}

// Updates an existing course offering with validation.
export async function updateOffering(offeringId, body) {
  const offering = await CourseOffering.findById(offeringId);
  if (!offering) {
    const err = new Error('Course offering not found');
    err.status = 404;
    throw err;
  }

  const { courseId, courseCode, semester, year, facultyId, facultyEmail, capacity, section, status, meetings, enrollStarts, enrollEnds } = body;

  let resolvedCourseUpdate = {};
  if (courseId || courseCode) {
    resolvedCourseUpdate.courseId = await resolveCourseId({ courseId, courseCode });
  }

  let resolvedFacultyUpdate = {};
  if (facultyId || facultyEmail) {
    resolvedFacultyUpdate.facultyId = await resolveFacultyId({ facultyId, facultyEmail });
  }

  if (capacity !== undefined && (isNaN(capacity) || Number(capacity) < 1 || Number(capacity) < Number(offering.enrolledCount || 0))) {
    const err = new Error('Invalid capacity');
    err.status = 400;
    throw err;
  }
  if (status !== undefined && !["Open", "Closed"].includes(status)) {
    const err = new Error('Invalid status');
    err.status = 400;
    throw err;
  }

  let enrollStartUpdate = undefined;
  let enrollEndUpdate = undefined;
  if (enrollStarts !== undefined) {
    enrollStartUpdate = parseDateOrNull(enrollStarts);
    if (!enrollStartUpdate) {
      const err = new Error('Invalid enrollStarts');
      err.status = 400;
      throw err;
    }
  }
  if (enrollEnds !== undefined) {
    enrollEndUpdate = parseDateOrNull(enrollEnds);
    if (!enrollEndUpdate) {
      const err = new Error('Invalid enrollEnds');
      err.status = 400;
      throw err;
    }
  }
  const effectiveStart = enrollStartUpdate ?? offering.enrollStarts;
  const effectiveEnd = enrollEndUpdate ?? offering.enrollEnds;
  if (effectiveStart && effectiveEnd && effectiveEnd <= effectiveStart) {
    const err = new Error('enrollEnds must be after enrollStarts');
    err.status = 400;
    throw err;
  }

  if (meetings !== undefined) {
    const meetingsCheck = validateMeetings(meetings);
    if (!meetingsCheck.ok) {
      const err = new Error(meetingsCheck.message);
      err.status = 400;
      throw err;
    }
  }

  const updated = await CourseOffering.findByIdAndUpdate(
    offeringId,
    {
      semester, year, capacity, section, status, meetings,
      ...(enrollStartUpdate ? { enrollStarts: enrollStartUpdate } : {}),
      ...(enrollEndUpdate ? { enrollEnds: enrollEndUpdate } : {}),
      ...resolvedFacultyUpdate,
      ...resolvedCourseUpdate,
    },
    { new: true, runValidators: true }
  );
  return updated;
}

// Deletes a course offering by ID.
export async function deleteOffering(offeringId) {
  const deleted = await CourseOffering.findByIdAndDelete(offeringId);
  if (!deleted) {
    const err = new Error('Course offering not found');
    err.status = 404;
    throw err;
  }
  return deleted;
}

// Retrieves a single course offering by ID with populated course and faculty.
export async function getOffering(offeringId) {
  const offering = await CourseOffering.findById(offeringId)
    .populate({ path: "courseId", select: "courseCode courseTitle credits department description" })
    .populate({ path: "facultyId", select: "name email" });
  if (!offering) {
    const err = new Error('Course offering not found');
    err.status = 404;
    throw err;
  }
  return offering;
}

// Retrieves a paginated list of offerings matching filters, optionally scoped to a faculty member.
export async function listOfferings(query, userRole, userId) {
  const page = Math.max(1, toInt(query.page, 1));
  const limit = Math.min(100, Math.max(1, toInt(query.limit, 20)));
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.semester) {
    if (!["Spring", "Summer", "Fall", "Winter"].includes(query.semester)) {
      const err = new Error('Invalid semester');
      err.status = 400;
      throw err;
    }
    filter.semester = query.semester;
  }
  if (query.year) {
    const y = Number(query.year);
    if (Number.isNaN(y) || y < 2000 || y > 2100) {
      const err = new Error('Invalid year');
      err.status = 400;
      throw err;
    }
    filter.year = y;
  }
  if (query.status) {
    if (!["Open", "Closed"].includes(query.status)) {
      const err = new Error('Invalid status');
      err.status = 400;
      throw err;
    }
    filter.status = query.status;
  }
  if (query.courseCode) {
    filter.courseId = await resolveCourseId({ courseCode: query.courseCode });
  }

  // Faculty only sees their own offerings
  if (userRole === 'faculty') {
    filter.facultyId = userId;
  } else {
    if (query.facultyEmail) {
      filter.facultyId = await resolveFacultyId({ facultyEmail: query.facultyEmail });
    }
    if (query.facultyName) {
      const faculties = await User.find({
        role: 'faculty',
        name: { $regex: String(query.facultyName), $options: 'i' }
      });
      filter.facultyId = { $in: faculties.map(f => f._id) };
    }
  }

  const offerings = await CourseOffering.find(filter)
    .populate({ path: "courseId", select: "courseCode courseTitle credits department" })
    .populate({ path: "facultyId", select: "name email role" })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const count = await CourseOffering.countDocuments(filter);
  return { count, page, limit, offerings };
}

// Retrieves course catalog (public-facing) with search, department filter, and pagination.
export async function getCourseCatalog(query) {
  const { semester, year, status, courseCode, search, department } = query;

  if (semester && !["Spring", "Summer", "Fall", "Winter"].includes(semester)) {
    const err = new Error("Invalid semester");
    err.status = 400;
    throw err;
  }
  if (year !== undefined && (isNaN(year) || year < 2000 || year > 2100)) {
    const err = new Error("Invalid year");
    err.status = 400;
    throw err;
  }

  const page = Math.max(1, toInt(query.page, 1));
  const limit = Math.min(100, Math.max(1, toInt(query.limit, 20)));
  const skip = (page - 1) * limit;

  const filter = {};
  if (semester) filter.semester = semester;
  if (year !== undefined) filter.year = Number(year);
  if (status) {
    if (!["Open", "Closed"].includes(status)) {
      const err = new Error('Invalid status');
      err.status = 400;
      throw err;
    }
    filter.status = status;
  }
  if (courseCode) {
    filter.courseId = await resolveCourseId({ courseCode });
  }

  const courseFilter = {};
  if (search) {
    const searchRegex = { $regex: String(search), $options: "i" };
    courseFilter.$or = [
      { courseTitle: searchRegex },
      { courseCode: searchRegex }
    ];
  }
  if (department) {
    courseFilter.department = { $regex: String(department), $options: "i" };
  }

  if (Object.keys(courseFilter).length > 0) {
    const matchingCourses = await Course.find(courseFilter).select('_id').lean();
    const courseIds = matchingCourses.map(c => c._id);
    if (filter.courseId) {
      if (!courseIds.some(id => String(id) === String(filter.courseId))) {
        return { count: 0, page, limit, offerings: [] };
      }
    } else {
      filter.courseId = { $in: courseIds };
    }
  }

  const offerings = await CourseOffering.find(filter)
    .populate({ path: "courseId", select: "courseCode courseTitle credits department description" })
    .populate({ path: "facultyId", select: "name email role" })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const count = await CourseOffering.countDocuments(filter);
  return { count, page, limit, offerings };
}

// Assigns a faculty member to a specific course offering.
export async function assignFaculty(offeringId, { facultyId, facultyEmail }) {
  if (!facultyId && !facultyEmail) {
    const err = new Error('facultyId or facultyEmail is required');
    err.status = 400;
    throw err;
  }

  const resolvedFacultyId = await resolveFacultyId({ facultyId, facultyEmail });

  const offering = await CourseOffering.findById(offeringId);
  if (!offering) {
    const err = new Error('Course offering not found');
    err.status = 404;
    throw err;
  }

  if (String(offering.facultyId) === String(resolvedFacultyId)) {
    return { alreadyAssigned: true, offering };
  }

  offering.facultyId = resolvedFacultyId;
  await offering.save();

  const populated = await CourseOffering.findById(offering._id)
    .populate({ path: 'courseId', select: 'courseCode courseTitle credits department' })
    .populate({ path: 'facultyId', select: 'name email role' });

  return { alreadyAssigned: false, offering: populated };
}
