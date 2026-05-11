import CourseOffering from "../models/CourseOffering.js";
import Attendance from "../models/Attendance.js";
import Enrollment from "../models/Enrollment.js";


export async function getEnrolledStudents(req, res) {
  try {
    const { courseOfferingId } = req.params;
    const offering = await CourseOffering.findById(courseOfferingId).select("_id");
    if (!offering) {
      return res.status(404).json({ message: "Course Offering not found" });
    }

    const enrollments = await Enrollment.find({
      courseOfferingId: offering._id,
      status: "Enrolled",
    })
      .populate("studentId", "name email")
      .lean();

    const students = enrollments
      .map((enrollment) => enrollment.studentId)
      .filter(Boolean);

    return res.status(200).json({ students });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function markAttendance(req, res) {
  try {
    const facultyId = req.user.id;
    const { courseOfferingId, studentId, status, date } = req.body;
    const offering = await CourseOffering.findById(courseOfferingId);
    if (!offering)
      return res.status(404).json({ message: "Course Offering not found" });
    if (offering.facultyId.toString() !== facultyId)
      return res
        .status(403)
        .json({ message: "Faculty not authorized to take attendance" });
    const enrollment = await Enrollment.findOne({
      studentId,
      courseOfferingId,
    });
    if(!enrollment || enrollment.status === "Dropped")
      return res.status(400).json({ message: "Student is not enrolled in this course" });
    const existingAttendance = await Attendance.findOne({
      courseOfferingId,
      studentId,
      date,
    });
    if (existingAttendance)
      return res
        .status(400)
        .json({ message: "Attendance already marked for this date" });
    const attendance = await Attendance.create({
      courseOfferingId,
      studentId,
      status,
      date,
    });
    return res.status(201).json({ attendance });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}


export async function getAttendance(req, res) {

   try {

      const studentId = req.user.id;

      const records = await Attendance.find({ studentId })
         .populate("courseOfferingId");

      const attendanceMap = {};

      for(const record of records) {

         const offeringId = record.courseOfferingId._id.toString();

         if(!attendanceMap[offeringId]) {

            attendanceMap[offeringId] = {
               courseOffering: record.courseOfferingId,
               totalClasses: 0,
               presentClasses: 0
            };
         }

         attendanceMap[offeringId].totalClasses++;

         if(record.status === "Present") {
            attendanceMap[offeringId].presentClasses++;
         }
      }

      const result = Object.values(attendanceMap).map(item => ({
         ...item,
         percentage:
            (item.presentClasses / item.totalClasses) * 100
      }));

      return res.status(200).json(result);

   } catch(err) {
     return res.status(500).json({ message: err.message || "Server error" });
   }
}

export async function getCourseAttendance(req, res) {//Faculty can view attendance records for their course offerings
    try {
        const facultyId = req.user.id;
        const { courseOfferingId } = req.params;
        const offering = await CourseOffering.findById(courseOfferingId);
        if (!offering)
            return res.status(404).json({ message: "Course Offering not found" });
        if (offering.facultyId.toString() !== facultyId)
            return res
                .status(403)
                .json({ message: "Faculty not authorized to view attendance" });
        const attendanceRecords = await Attendance.find({ courseOfferingId }).populate("studentId", "name rollNumber");
        return res.status(200).json({ attendance: attendanceRecords });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
