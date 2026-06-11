import * as courseService from "../services/courseService.js";

// Handles HTTP request to create a new course.
export async function createCourse(req, res, next) {
  try {
    const course = await courseService.createCourse(req.body);
    return res.status(201).json({ message: "Course created successfully", course });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

// Handles HTTP request to retrieve a specific course by ID.
export async function getCourse(req, res, next) {
  try {
    const course = await courseService.getCourse(req.params.id);
    return res.status(200).json(course);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

// Handles HTTP request to update an existing course.
export async function updateCourse(req, res, next) {
  try {
    const updated = await courseService.updateCourse(req.params.id, req.body);
    return res.status(200).json({ message: "Course updated successfully", course: updated });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

// Handles HTTP request to delete a course.
export async function deleteCourse(req, res, next) {
  try {
    await courseService.deleteCourse(req.params.id);
    return res.status(200).json({ message: "Course deleted successfully" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

// Handles HTTP request to retrieve a paginated list of courses.
export async function getAllCourses(req, res, next) {
  try {
    const result = await courseService.getAllCourses(req.query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
