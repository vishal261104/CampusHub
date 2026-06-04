import CourseOffering from '../models/CourseOffering.js';
import User from '../models/User.js';
import Course from '../models/Course.js';

function toInt(value, fallback) {
    const n = Number.parseInt(String(value), 10);
    return Number.isFinite(n) ? n : fallback;
}

function timeToMinutes(hhmm) {
    const [h, m] = String(hhmm).split(':').map((x) => Number.parseInt(x, 10));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
}

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

function parseDateOrNull(value) {
    if (value === undefined || value === null || value === '') return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

async function resolveFacultyId({ facultyId, facultyEmail }) {
    if (facultyId) {
        const faculty = await User.findById(facultyId);
        if (!faculty || faculty.role !== 'faculty') {
            return { ok: false, message: 'Invalid faculty member' };
        }
        return { ok: true, facultyId: faculty._id };
    }

    if (facultyEmail) {
        const normalizedEmail = String(facultyEmail).trim().toLowerCase();
        const faculty = await User.findOne({ email: normalizedEmail });
        if (!faculty || faculty.role !== 'faculty') {
            return { ok: false, message: 'Invalid faculty member' };
        }
        return { ok: true, facultyId: faculty._id };
    }

    return { ok: false, message: 'facultyId or facultyEmail is required' };
}

async function resolveCourseId({ courseId, courseCode }) {
    if (courseId) {
        const course = await Course.findById(courseId);
        if (!course) {
            return { ok: false, message: 'Invalid courseId' };
        }
        return { ok: true, courseId: course._id };
    }

    if (courseCode) {
        const normalizedCode = String(courseCode).trim();
        const course = await Course.findOne({ courseCode: normalizedCode });
        if (!course) {
            return { ok: false, message: 'Invalid courseCode' };
        }
        return { ok: true, courseId: course._id };
    }

    return { ok: false, message: 'courseId or courseCode is required' };
}
export async function getCourseCatalog(req, res, next) {
  try {
        const { semester, year } = req.query;
    if (!semester || !year) {
      return res
        .status(400)
        .json({ message: "semester and year are required" });
    }
    if (!["Spring", "Summer", "Fall","Winter"].includes(semester)) {
      return res.status(400).json({ message: "Invalid semester" });
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ message: "Invalid year" });
    }
        const page = Math.max(1, toInt(req.query.page, 1));
        const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 20)));
        const skip = (page - 1) * limit;

        const filter = { semester, year: Number(year) };
        const status = req.query.status;
        if (status) {
            if (!["Open", "Closed"].includes(status)) {
                return res.status(400).json({ message: 'Invalid status' });
            }
            filter.status = status;
        }

        if (req.query.courseCode) {
            const courseResolved = await resolveCourseId({ courseCode: req.query.courseCode });
            if (!courseResolved.ok) {
                return res.status(400).json({ message: courseResolved.message });
            }
            filter.courseId = courseResolved.courseId;
        }

        const offerings = await CourseOffering.find(filter)
            .populate({
                path: "courseId",
                select: "courseCode courseTitle credits department description",
            })
            .populate({
                path: "facultyId",
                select: "name email role",
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const count = await CourseOffering.countDocuments(filter);
        return res.status(200).json({ count, page, limit, offerings });
  } catch (err) {
        return next(err);
  }
}
export async function createCourseOffering(req, res, next) {
    try{
                const { courseId, courseCode, semester, year ,facultyId, facultyEmail, capacity, section, status, meetings, enrollStarts, enrollEnds } = req.body;
        if (!semester || !year) {
            return res.status(400).json({ message: 'semester and year are required' });
        }

        const courseResolved = await resolveCourseId({ courseId, courseCode });
        if (!courseResolved.ok) {
            return res.status(400).json({ message: courseResolved.message });
        }

        const facultyResolved = await resolveFacultyId({ facultyId, facultyEmail });
        if (!facultyResolved.ok) {
            return res.status(400).json({ message: facultyResolved.message });
        }
        if (!["Spring", "Summer", "Fall","Winter"].includes(semester)) {
            return res.status(400).json({ message: 'Invalid semester' });
        }
        if (isNaN(year) || year < 2000 || year > 2100) {
            return res.status(400).json({ message: 'Invalid year' });
        }

        if (capacity === undefined || isNaN(capacity) || Number(capacity) < 1) {
            return res.status(400).json({ message: 'capacity must be at least 1' });
        }

        if (status !== undefined && !["Open", "Closed"].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const start = parseDateOrNull(enrollStarts);
        const end = parseDateOrNull(enrollEnds);
        if (!start || !end) {
            return res.status(400).json({ message: 'enrollStarts and enrollEnds are required and must be valid dates' });
        }
        if (end <= start) {
            return res.status(400).json({ message: 'enrollEnds must be after enrollStarts' });
        }

        const meetingsCheck = validateMeetings(meetings);
        if (!meetingsCheck.ok) {
            return res.status(400).json({ message: meetingsCheck.message });
        }

        const offering = new CourseOffering({
            courseId: courseResolved.courseId,
            semester,
            year,
            facultyId: facultyResolved.facultyId,
            capacity,
            ...(section !== undefined ? { section } : {}),
            ...(status !== undefined ? { status } : {}),
            meetings,
            enrollStarts: start,
            enrollEnds: end,
        });
        await offering.save();
        return res.status(201).json({ message: 'Course offering created successfully', offering });
    }
    catch (err) {
        if (err?.code === 11000) {
            return res.status(409).json({ message: 'Duplicate offering (course + semester + year + section)' });
        }
        return next(err);
    }
}
export async function updateOffering(req, res, next){
     try{
        const offeringId = req.params.id;
        const offering = await CourseOffering.findById(offeringId);
        if (!offering) {
            return res.status(404).json({ message: 'Course offering not found' });
        }

        const { courseId, courseCode, semester, year ,facultyId, facultyEmail, capacity, section, status, meetings, enrollStarts, enrollEnds } = req.body;
        if (!courseId && !courseCode && !semester && year === undefined && !facultyId && !facultyEmail && capacity === undefined && section === undefined && status === undefined && meetings === undefined && enrollStarts === undefined && enrollEnds === undefined) {
            return res.status(400).json({ message: 'At least one field (courseId, courseCode, semester, year, facultyId, facultyEmail, capacity, section, status, meetings, enrollStarts, enrollEnds) is required to update' });
        }

        let resolvedCourseUpdate = {};
        if (courseId || courseCode) {
            const courseResolved = await resolveCourseId({ courseId, courseCode });
            if (!courseResolved.ok) {
                return res.status(400).json({ message: courseResolved.message });
            }
            resolvedCourseUpdate = { courseId: courseResolved.courseId };
        }

        let resolvedFacultyUpdate = {};
        if (facultyId || facultyEmail) {
            const facultyResolved = await resolveFacultyId({ facultyId, facultyEmail });
            if (!facultyResolved.ok) {
                return res.status(400).json({ message: facultyResolved.message });
            }
            resolvedFacultyUpdate = { facultyId: facultyResolved.facultyId };
        }
        if(capacity !== undefined && (isNaN(capacity) || Number(capacity) < 1 || Number(capacity) < Number(offering.enrolledCount || 0))) {
            return res.status(400).json({ message: 'Invalid capacity' });
        }

        if (status !== undefined && !["Open", "Closed"].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        let enrollStartUpdate = undefined;
        let enrollEndUpdate = undefined;
        if (enrollStarts !== undefined) {
            enrollStartUpdate = parseDateOrNull(enrollStarts);
            if (!enrollStartUpdate) {
                return res.status(400).json({ message: 'Invalid enrollStarts' });
            }
        }
        if (enrollEnds !== undefined) {
            enrollEndUpdate = parseDateOrNull(enrollEnds);
            if (!enrollEndUpdate) {
                return res.status(400).json({ message: 'Invalid enrollEnds' });
            }
        }
        const effectiveStart = enrollStartUpdate ?? offering.enrollStarts;
        const effectiveEnd = enrollEndUpdate ?? offering.enrollEnds;
        if (effectiveStart && effectiveEnd && effectiveEnd <= effectiveStart) {
            return res.status(400).json({ message: 'enrollEnds must be after enrollStarts' });
        }

        if (meetings !== undefined) {
            const meetingsCheck = validateMeetings(meetings);
            if (!meetingsCheck.ok) {
                return res.status(400).json({ message: meetingsCheck.message });
            }
        }

        const updated = await CourseOffering.findByIdAndUpdate(
            offeringId,
            {
              semester,
              year,
              capacity,
              section,
              status,
              meetings,
              ...(enrollStartUpdate ? { enrollStarts: enrollStartUpdate } : {}),
              ...(enrollEndUpdate ? { enrollEnds: enrollEndUpdate } : {}),
              ...resolvedFacultyUpdate,
              ...resolvedCourseUpdate,
            },
            { new: true, runValidators: true }
        );
        return res.status(200).json({ message: 'Course offering updated successfully', offering: updated });
     }
     catch (err) {
        if (err?.code === 11000) {
            return res.status(409).json({ message: 'Duplicate offering (course + semester + year + section)' });
        }
        return next(err);
    }
}
export async function deleteOffering(req, res, next){
    try{
        const offeringId = req.params.id;
        const deleted = await CourseOffering.findByIdAndDelete(offeringId);
        if (!deleted) {
            return res.status(404).json({ message: 'Course offering not found' });
        }
        return res.status(200).json({ message: 'Course offering deleted successfully' });
    }
    catch (err) {
        return next(err);
    }
}
export async function listOfferings(req, res, next){
    try{
                                const page = Math.max(1, toInt(req.query.page, 1));
                                const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 20)));
                                const skip = (page - 1) * limit;

                                const filter = {};
                                if (req.query.semester) {
                                    if (!["Spring", "Summer", "Fall", "Winter"].includes(req.query.semester)) {
                                        return res.status(400).json({ message: 'Invalid semester' });
                                    }
                                    filter.semester = req.query.semester;
                                }
                                if (req.query.year) {
                                    const y = Number(req.query.year);
                                    if (Number.isNaN(y) || y < 2000 || y > 2100) {
                                        return res.status(400).json({ message: 'Invalid year' });
                                    }
                                    filter.year = y;
                                }
                                if (req.query.status) {
                                    if (!["Open", "Closed"].includes(req.query.status)) {
                                        return res.status(400).json({ message: 'Invalid status' });
                                    }
                                    filter.status = req.query.status;
                                }

                                if (req.query.courseCode) {
                                    const courseResolved = await resolveCourseId({ courseCode: req.query.courseCode });
                                    if (!courseResolved.ok) {
                                        return res.status(400).json({ message: courseResolved.message });
                                    }
                                    filter.courseId = courseResolved.courseId;
                                }
                                if (req.query.facultyEmail) {
                                    const facultyResolved = await resolveFacultyId({ facultyEmail: req.query.facultyEmail });
                                    if (!facultyResolved.ok) {
                                        return res.status(400).json({ message: facultyResolved.message });
                                    }
                                    filter.facultyId = facultyResolved.facultyId;
                                }

                                const offerings = await CourseOffering.find(filter)
                    .populate({
                        path: "courseId",
                        select: "courseCode courseTitle credits department",
                    })
                    .populate({
                        path: "facultyId",
                        select: "name email role",
                                        })
                                        .sort({ createdAt: -1 })
                                        .skip(skip)
                                        .limit(limit);

                const count = await CourseOffering.countDocuments(filter);
                return res.status(200).json({ count, page, limit, offerings });
    }
    catch (err) {
        return next(err);
    }
}
export async function getOffering(req, res, next){
    try{
        const offeringId = req.params.id;
        const offering = await CourseOffering.findById(offeringId).populate({
            path: "courseId",
            select: "courseCode courseTitle credits department description",
        }).populate({
            path: "facultyId",
            select: "name email",
        });
        if (!offering) {
            return res.status(404).json({ message: 'Course offering not found' });
        }
        return res.status(200).json({ offering });
    }
    catch (err) {
        return next(err);
    }
}
export async function assignFacultyToOffering(req, res, next) {
  try {
    const offeringId = req.params.id;
    const { facultyId, facultyEmail } = req.body;

    if (!facultyId && !facultyEmail) {
      return res.status(400).json({ message: 'facultyId or facultyEmail is required' });
    }

    const facultyResolved = await resolveFacultyId({ facultyId, facultyEmail });
    if (!facultyResolved.ok) {
      return res.status(400).json({ message: facultyResolved.message });
    }

    const offering = await CourseOffering.findById(offeringId);
    if (!offering) {
      return res.status(404).json({ message: 'Course offering not found' });
    }

    if (String(offering.facultyId) === String(facultyResolved.facultyId)) {
      return res.status(200).json({ message: 'Faculty already assigned', offering });
    }

    offering.facultyId = facultyResolved.facultyId;
    await offering.save();

    const populated = await CourseOffering.findById(offering._id)
      .populate({ path: 'courseId', select: 'courseCode courseTitle credits department' })
      .populate({ path: 'facultyId', select: 'name email role' });

    return res.status(200).json({
      message: 'Faculty assigned to course offering successfully',
      offering: populated,
    });
  } catch (err) {
        return next(err);
  }
}