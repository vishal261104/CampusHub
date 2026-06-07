import Course from "../models/Course.js";
import CourseOffering from "../models/CourseOffering.js";

/**
 * Creates a new course in the course catalog.
 * @param {Object} req - Express request object containing course details.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export async function createCourse(req, res, next) {
  try {
    const { courseCode, courseTitle, credits, department, description } =
      req.body;
    const course = new Course({
      courseCode,
      courseTitle,
      credits,
      department,
      description,
    });
    await course.save();
    return res
      .status(201)
      .json({ message: "Course created successfully", course });
  } catch (err) {
    return next(err);
  }
}

/**
 * Retrieves a specific course by its ID.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export async function getCourse(req, res, next) {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    return res.status(200).json(course);
  } catch (err) {
    return next(err);
  }
}

/**
 * Updates an existing course's details.
 * @param {Object} req - Express request object containing updated course data.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export async function updateCourse(req, res, next) {
  try {
    const courseId = req.params.id;
    const { courseCode, courseTitle, credits, department, description } =
      req.body;
    if (
      !courseCode &&
      !courseTitle &&
      credits === undefined &&
      !department &&
      !description
    ) {
      return res.status(400).json({
        message:
          "At least one field (courseCode, courseTitle, credits, department, description) is required to update",
      });
    }
    const updated = await Course.findByIdAndUpdate(
      courseId,
      { courseCode, courseTitle, credits, department, description },
      { new: true, runValidators: true },
    );
    if (!updated) {
      return res.status(404).json({ message: "Course not found" });
    }
    return res
      .status(200)
      .json({ message: "Course updated successfully", course: updated });
  } catch (err) {
    return next(err);
  }
}

/**
 * Deletes a course from the catalog.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export async function deleteCourse(req, res, next) {
  try {
    const courseId = req.params.id;
    const deleted = await Course.findByIdAndDelete(courseId);
    if (!deleted) {
      return res.status(404).json({ message: "Course not found" });
    }
    return res.status(200).json({ message: "Course deleted successfully" });
  } catch (err) {
    return next(err);
  }
}

/**
 * Helper function to sort courses alphabetically by courseCode.
 * @param {Array} courses - Array of course objects.
 */
function sortCourses(courses) {
  courses.sort((a, b) =>
    String(a.courseCode || "").localeCompare(String(b.courseCode || "")),
  );
}

/**
 * Retrieves a paginated list of all courses, optionally filtered by department.
 * @param {Object} req - Express request object containing query parameters.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export async function getAllCourses(req, res, next) {
  const page = Math.max(
    1,
    Number.parseInt(String(req.query.page || "1"), 10) || 1,
  );
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.limit || "20"), 10) || 20),
  );
  const skip = (page - 1) * limit;
  const filter = {};
  if(req.query.department){
    filter.department = { $regex: String(req.query.department), $options: 'i' };
  }
  if (req.query.search) {
    const searchRegex = { $regex: String(req.query.search), $options: "i" };
    filter.$or = [
      { courseTitle: searchRegex },
      { department: searchRegex },
      { courseCode: searchRegex },
    ];
  }

  try {
    const [courses, count] = await Promise.all([
      Course.find(filter)
        .sort({ courseCode: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Course.countDocuments(filter),
    ]);
    return res.status(200).json({ count, page, limit, courses });
  } catch (err) {
    return next(err);
  }
}
