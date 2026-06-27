import * as offeringService from './courseOffering.service.js';

// Handles HTTP request to retrieve course catalog entries.
export async function getCourseCatalog(req, res, next) {
  try {
    const result = await offeringService.getCourseCatalog(req.query);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

// Handles HTTP request to create a new course offering.
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

// Handles HTTP request to update a course offering.
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

// Handles HTTP request to delete a course offering.
export async function deleteOffering(req, res, next) {
  try {
    await offeringService.deleteOffering(req.params.id);
    return res.status(200).json({ message: 'Course offering deleted successfully' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

// Handles HTTP request to list course offerings with filters.
export async function listOfferings(req, res, next) {
  try {
    const result = await offeringService.listOfferings(req.query, req.user?.role, req.user?.id);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

// Handles HTTP request to retrieve a single course offering by ID.
export async function getOffering(req, res, next) {
  try {
    const offering = await offeringService.getOffering(req.params.id);
    return res.status(200).json({ offering });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

// Handles HTTP request to assign faculty to a course offering.
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