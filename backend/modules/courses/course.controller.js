import * as courseService from "./course.service.js";

/**
 * Controller to create a new base course in the catalog.
 * Route: POST /api/courses/course
 * Access: Admin
 */
export async function createCourse(req, res, next) {
  try {
    const course = await courseService.createCourse(req.body);
    return res.status(201).json({ message: "Course created successfully", course });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

/**
 * Controller to fetch details of a specific base course by ID.
 * Route: GET /api/courses/course/:id
 * Access: Authenticated Users
 */
export async function getCourse(req, res, next) {
  try {
    const course = await courseService.getCourse(req.params.id);
    return res.status(200).json(course);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

/**
 * Controller to update a base course's details (e.g. credits, description).
 * Route: PUT /api/courses/course/:id
 * Access: Admin
 */
export async function updateCourse(req, res, next) {
  try {
    const updated = await courseService.updateCourse(req.params.id, req.body);
    return res.status(200).json({ message: "Course updated successfully", course: updated });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

/**
 * Controller to delete a base course from the catalog.
 * Route: DELETE /api/courses/course/:id
 * Access: Admin
 */
export async function deleteCourse(req, res, next) {
  try {
    await courseService.deleteCourse(req.params.id);
    return res.status(200).json({ message: "Course deleted successfully" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

/**
 * Controller to fetch all base courses, with optional pagination and search filters.
 * Route: GET /api/courses/catalog
 * Access: Authenticated Users
 */
export async function getAllCourses(req, res, next) {
  try {
    const result = await courseService.getAllCourses(req.query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
