import Course from '../models/Course.js';
import CourseOffering from '../models/CourseOffering.js';

export async function createCourse(req, res) {
    try {
    const { courseCode, courseTitle, credits, department, description } = req.body;
    const course = new Course({ courseCode, courseTitle, credits, department, description });
        await course.save();
        return res.status(201).json({ message: 'Course created successfully', course });
    } catch (err) {
        return res.status(500).json({ message: err.message || 'Server error' });
    }
}


export async function getCourse(req, res) {
    try {
        const courseId = req.params.id;
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        return res.status(200).json(course);
    } catch (err) {
        return res.status(500).json({ message: err.message || 'Server error' });
    }
}

export async function updateCourse(req, res) {
    try {
        const courseId = req.params.id;
    const { courseCode, courseTitle, credits, department, description } = req.body;
    if (!courseCode && !courseTitle && credits === undefined && !department && !description) {
      return res.status(400).json({ message: 'At least one field (courseCode, courseTitle, credits, department, description) is required to update' });
        }
        const updated = await Course.findByIdAndUpdate(
            courseId,
      { courseCode, courseTitle, credits, department, description },
            { new: true, runValidators: true }
        );
        if (!updated) {
            return res.status(404).json({ message: 'Course not found' });
        }
        return res.status(200).json({ message: 'Course updated successfully', course: updated });
    }
    catch (err) {
        return res.status(500).json({ message: err.message || 'Server error' });
    }   
}

export async function deleteCourse(req, res) {
    try {
        const courseId = req.params.id;
        const deleted = await Course.findByIdAndDelete(courseId);
        if (!deleted) {
            return res.status(404).json({ message: 'Course not found' });
        }
        return res.status(200).json({ message: 'Course deleted successfully' });
    }
    catch (err) {
        return res.status(500).json({ message: err.message || 'Server error' });
    }
}


function sortCourses(courses) {
  courses.sort((a, b) => String(a.courseCode || '').localeCompare(String(b.courseCode || '')));
}

export async function getCourseCatalog(req, res) {
  try {
    const { semester, year } = req.query;
    if (!semester || !year) {
      return res
        .status(400)
        .json({ message: "semester and year are required" });
    }
    if (!["Spring", "Summer", "Fall"].includes(semester)) {
      return res.status(400).json({ message: "Invalid semester" });
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ message: "Invalid year" });
    }
    const offerings = await CourseOffering.find({ semester, year }).populate({
      path: "courseId",
      select: "courseCode courseTitle credits department description",
    });

    return res.status(200).json({ offerings });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}
export async function getAllCourses(req, res) {
  try {
    const courses = await Course.find();
    sortCourses(courses);
    const count = await Course.countDocuments();
    return res.status(200).json({ count,courses });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}
