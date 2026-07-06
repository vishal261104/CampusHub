import * as offeringService from './courseOffering.service.js';

/**
 * Controller to fetch the full catalog of available course offerings.
 * Supports filtering by semester, year, status, courseCode, and a search string.
 * Route: GET /api/courses/course-catalog
 * Access: Authenticated Users
 */
export async function getCourseCatalog(req, res, next) {
  try {
    const result = await offeringService.getCourseCatalog(req.query);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

/**
 * Controller to create a new course offering for a specific term and year.
 * Prevents duplicates (same course, semester, year, and section).
 * Route: POST /api/courses/course-offering
 * Access: Admin
 */
export async function createCourseOffering(req, res, next) {
  try {
    const offering = await offeringService.createOffering(req.body);
    return res.status(201).json({ message: 'Course offering created successfully', offering });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Duplicate offering (course + semester + year + section)' });
    }
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

/**
 * Controller to update an existing course offering.
 * Used for changing capacity, enroll dates, or assigned faculty.
 * Route: PUT /api/courses/course-offering/:id
 * Access: Admin
 */
export async function updateOffering(req, res, next) {
  try {
    const updated = await offeringService.updateOffering(req.params.id, req.body);
    return res.status(200).json({ message: 'Course offering updated successfully', offering: updated });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Duplicate offering (course + semester + year + section)' });
    }
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

/**
 * Controller to permanently delete a course offering.
 * Route: DELETE /api/courses/course-offering/:id
 * Access: Admin
 */
export async function deleteOffering(req, res, next) {
  try {
    await offeringService.deleteOffering(req.params.id);
    return res.status(200).json({ message: 'Course offering deleted successfully' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

/**
 * Controller to list active course offerings.
 * If accessed by faculty, automatically filters to show only the courses they are teaching.
 * Route: GET /api/courses/course-offerings
 * Access: Admin, Faculty
 */
export async function listOfferings(req, res, next) {
  try {
    const result = await offeringService.listOfferings(req.query, req.user?.role, req.user?.id);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

/**
 * Controller to fetch detailed information about a single course offering by its ID.
 * Route: GET /api/courses/course-offering/:id
 * Access: Authenticated Users
 */
export async function getOffering(req, res, next) {
  try {
    const offering = await offeringService.getOffering(req.params.id);
    return res.status(200).json({ offering });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

/**
 * Controller to explicitly assign or change the faculty member for a course offering.
 * Route: PATCH /api/courses/course-offering/:id/faculty
 * Access: Admin
 */
export async function assignFacultyToOffering(req, res, next) {
  try {
    const { alreadyAssigned, offering } = await offeringService.assignFaculty(req.params.id, req.body);
    if (alreadyAssigned) {
      return res.status(200).json({ message: 'Faculty already assigned', offering });
    }
    return res.status(200).json({ message: 'Faculty assigned to course offering successfully', offering });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}