import Course from "./course.model.js";

// Creates a new course in the catalog.
export async function createCourse({ courseCode, courseTitle, credits, department, description }) {
  const course = new Course({ courseCode, courseTitle, credits, department, description });
  await course.save();
  return course;
}

// Retrieves a single course by ID.
export async function getCourse(courseId) {
  const course = await Course.findById(courseId);
  if (!course) {
    const err = new Error("Course not found");
    err.status = 404;
    throw err;
  }
  return course;
}

// Updates an existing course's details.
export async function updateCourse(courseId, { courseCode, courseTitle, credits, department, description }) {
  if (!courseCode && !courseTitle && credits === undefined && !department && !description) {
    const err = new Error("At least one field (courseCode, courseTitle, credits, department, description) is required to update");
    err.status = 400;
    throw err;
  }
  const updated = await Course.findByIdAndUpdate(
    courseId,
    { courseCode, courseTitle, credits, department, description },
    { new: true, runValidators: true },
  );
  if (!updated) {
    const err = new Error("Course not found");
    err.status = 404;
    throw err;
  }
  return updated;
}

// Deletes a course by ID.
export async function deleteCourse(courseId) {
  const deleted = await Course.findByIdAndDelete(courseId);
  if (!deleted) {
    const err = new Error("Course not found");
    err.status = 404;
    throw err;
  }
  return deleted;
}

// Retrieves a paginated list of courses, optionally filtered by department or search query.
export async function getAllCourses({ page = 1, limit = 20, department, search }) {
  const p = Math.max(1, parseInt(String(page), 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
  const skip = (p - 1) * l;

  const filter = {};
  if (department) {
    filter.department = { $regex: String(department), $options: 'i' };
  }
  if (search) {
    const searchRegex = { $regex: String(search), $options: "i" };
    filter.$or = [
      { courseTitle: searchRegex },
      { department: searchRegex },
      { courseCode: searchRegex },
    ];
  }

  const [courses, count] = await Promise.all([
    Course.find(filter).sort({ courseCode: 1 }).skip(skip).limit(l).lean(),
    Course.countDocuments(filter),
  ]);
  return { count, page: p, limit: l, courses };
}
