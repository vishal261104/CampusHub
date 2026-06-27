import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileMap = {
  // Auth
  'routes/authRoutes.js': 'modules/auth/auth.routes.js',
  'controllers/authController.js': 'modules/auth/auth.controller.js',
  'services/authService.js': 'modules/auth/auth.service.js',

  // Users
  'models/User.js': 'modules/users/user.model.js',
  'routes/userRoutes.js': 'modules/users/user.routes.js',
  'controllers/userController.js': 'modules/users/user.controller.js',
  'controllers/setUserRole.js': 'modules/users/setUserRole.js',
  'controllers/setUserRoleByEmail.js': 'modules/users/setUserRoleByEmail.js',
  'services/userService.js': 'modules/users/user.service.js',

  // Courses
  'models/Course.js': 'modules/courses/course.model.js',
  'models/CourseOffering.js': 'modules/courses/courseOffering.model.js',
  'routes/courseRoutes.js': 'modules/courses/course.routes.js',
  'controllers/courseController.js': 'modules/courses/course.controller.js',
  'controllers/courseOfferingController.js': 'modules/courses/courseOffering.controller.js',
  'services/courseService.js': 'modules/courses/course.service.js',
  'services/courseOfferingService.js': 'modules/courses/courseOffering.service.js',

  // Enrollments
  'models/Enrollment.js': 'modules/enrollments/enrollment.model.js',
  'routes/enrollmentRoutes.js': 'modules/enrollments/enrollment.routes.js',
  'controllers/enrollmentController.js': 'modules/enrollments/enrollment.controller.js',
  'controllers/registrationController.js': 'modules/enrollments/registration.controller.js',
  'services/enrollmentService.js': 'modules/enrollments/enrollment.service.js',
  'services/registrationService.js': 'modules/enrollments/registration.service.js',

  // Attendance
  'models/Attendance.js': 'modules/attendance/attendance.model.js',
  'routes/attendanceRoutes.js': 'modules/attendance/attendance.routes.js',
  'controllers/attendanceController.js': 'modules/attendance/attendance.controller.js',
  'services/attendanceService.js': 'modules/attendance/attendance.service.js',

  // Hostel
  'models/HostelApplication.js': 'modules/hostel/hostelApplication.model.js',
  'models/HostelRoom.js': 'modules/hostel/hostelRoom.model.js',
  'models/HostelSettings.js': 'modules/hostel/hostelSettings.model.js',
  'models/RoomAllocation.js': 'modules/hostel/roomAllocation.model.js',
  'models/Complaint.js': 'modules/hostel/complaint.model.js',
  'routes/hostelRoutes.js': 'modules/hostel/hostel.routes.js',
  'routes/roomRoutes.js': 'modules/hostel/room.routes.js',
  'routes/complaintRoutes.js': 'modules/hostel/complaint.routes.js',
  'controllers/hostelController.js': 'modules/hostel/hostel.controller.js',
  'controllers/hostelComplaintController.js': 'modules/hostel/hostelComplaint.controller.js',
  'services/hostelRoomService.js': 'modules/hostel/hostelRoom.service.js',
  'services/hostelComplaintService.js': 'modules/hostel/hostelComplaint.service.js',
  'services/roomAllocationService.js': 'modules/hostel/roomAllocation.service.js',

  // Outing
  'models/Outing.js': 'modules/outing/outing.model.js',
  'models/LeaveRequest.js': 'modules/outing/leaveRequest.model.js',
  'routes/outingLeaveRoutes.js': 'modules/outing/outingLeave.routes.js',
  'controllers/outingLeaveController.js': 'modules/outing/outingLeave.controller.js',
  'services/outingLeaveService.js': 'modules/outing/outingLeave.service.js',

  // Fees
  'models/FeeStructure.js': 'modules/fees/feeStructure.model.js',
  'models/StudentFeeRecord.js': 'modules/fees/studentFeeRecord.model.js',
  'routes/feeRoutes.js': 'modules/fees/fee.routes.js', 
  'controllers/feeController.js': 'modules/fees/fee.controller.js',
  'controllers/feeManagementController.js': 'modules/fees/feeManagement.controller.js',
  'services/feeService.js': 'modules/fees/fee.service.js',
  'services/studentFeeService.js': 'modules/fees/studentFee.service.js',

  // Payments
  'models/FeePayment.js': 'modules/payments/payment.model.js',
  'controllers/paymentController.js': 'modules/payments/payment.controller.js',
  'services/stripeService.js': 'modules/payments/payment.service.js',

  // Core / Shared
  'models/Counter.js': 'modules/core/counter.model.js',
  'models/SemesterConfig.js': 'modules/core/semesterConfig.model.js',
  'services/semesterService.js': 'modules/core/semester.service.js',
};

const middlewares = {
  'middleware/authMiddleware.js': 'middleware/authMiddleware.js',
  'middleware/authRoles.js': 'middleware/authRoles.js',
  'middleware/attachUser.js': 'middleware/attachUser.js',
  'middleware/errorHandler.js': 'middleware/errorHandler.js'
};

const completeMap = { ...fileMap, ...middlewares };
completeMap['index.js'] = 'index.js';
completeMap['config/db.js'] = 'config/db.js';

const absoluteMap = {};
for (const [oldRel, newRel] of Object.entries(completeMap)) {
  absoluteMap[path.join(__dirname, oldRel.replace(/\//g, path.sep))] = path.join(__dirname, newRel.replace(/\//g, path.sep));
}

// Multiline regex
const importRegex = /import\s+[\s\S]*?from\s+['"]([^'"]+)['"]/g;

const filesToFix = [
  'modules/enrollments/enrollment.routes.js',
  'modules/fees/fee.routes.js',
  'modules/hostel/complaint.routes.js',
  'modules/hostel/hostel.routes.js',
  'modules/hostel/hostelComplaint.controller.js',
  'modules/hostel/room.routes.js',
  'modules/outing/outingLeave.routes.js'
];

filesToFix.forEach(relPath => {
  const absNewPath = path.join(__dirname, relPath.replace(/\//g, path.sep));
  // Find what the old path was based on the new path
  let oldPathRel = Object.keys(fileMap).find(k => fileMap[k] === relPath);
  if (!oldPathRel) return;
  const absOldPath = path.join(__dirname, oldPathRel.replace(/\//g, path.sep));

  let content = fs.readFileSync(absNewPath, 'utf8');

  content = content.replace(importRegex, (match, importPath) => {
    if (!importPath.startsWith('.')) return match;
    // Resolve the original import path relative to where the file USED to be
    const oldDir = path.dirname(absOldPath);
    let resolvedImportPath = path.resolve(oldDir, importPath);
    
    let newImportedPath = absoluteMap[resolvedImportPath];
    if (!newImportedPath) {
      newImportedPath = resolvedImportPath;
    }

    const newDir = path.dirname(absNewPath);
    let newRelativePath = path.relative(newDir, newImportedPath);
    newRelativePath = newRelativePath.replace(/\\/g, '/');
    if (!newRelativePath.startsWith('.')) {
      newRelativePath = './' + newRelativePath;
    }

    return match.replace(importPath, newRelativePath);
  });

  fs.writeFileSync(absNewPath, content, 'utf8');
  console.log('Fixed', absNewPath);
});
