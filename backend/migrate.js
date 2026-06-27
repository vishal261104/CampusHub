import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Define the mapping from old paths (relative to backend/) to new paths
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
  'routes/feeRoutes.js': 'modules/fees/fee.routes.js', // We will manually extract payment routes later
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

// Also map middleware so their imports get updated correctly when moved to modules
const middlewares = {
  'middleware/authMiddleware.js': 'middleware/authMiddleware.js',
  'middleware/authRoles.js': 'middleware/authRoles.js',
  'middleware/attachUser.js': 'middleware/attachUser.js',
  'middleware/errorHandler.js': 'middleware/errorHandler.js'
};

// Map everything so we know how to resolve imports
const completeMap = { ...fileMap, ...middlewares };
// Add index.js and db.js to map for completion
completeMap['index.js'] = 'index.js';
completeMap['config/db.js'] = 'config/db.js';

const absoluteMap = {};
for (const [oldRel, newRel] of Object.entries(completeMap)) {
  absoluteMap[path.join(__dirname, oldRel.replace(/\//g, path.sep))] = path.join(__dirname, newRel.replace(/\//g, path.sep));
}

// 2. Read file contents and rewrite imports based on OLD locations
const fileContents = {};

for (const [oldPath, newPath] of Object.entries(fileMap)) {
  const absOldPath = path.join(__dirname, oldPath.replace(/\//g, path.sep));
  if (fs.existsSync(absOldPath)) {
    fileContents[absOldPath] = fs.readFileSync(absOldPath, 'utf8');
  } else {
    console.warn(`Warning: File not found: ${absOldPath}`);
  }
}

// Read index.js and middlewares to update their imports too
const extras = [
  'index.js',
  'middleware/authMiddleware.js',
  'middleware/authRoles.js',
  'middleware/attachUser.js'
];

for (const extra of extras) {
  const absPath = path.join(__dirname, extra.replace(/\//g, path.sep));
  if (fs.existsSync(absPath)) {
    fileContents[absPath] = fs.readFileSync(absPath, 'utf8');
  }
}

// 3. Regex to find imports
const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;

for (const [absOldPath, content] of Object.entries(fileContents)) {
  const isExtra = !Object.keys(fileMap).map(p => path.join(__dirname, p.replace(/\//g, path.sep))).includes(absOldPath);
  const absNewPath = isExtra ? absOldPath : absoluteMap[absOldPath];
  
  const newContent = content.replace(importRegex, (match, importPath) => {
    // Only care about relative imports
    if (!importPath.startsWith('.')) return match;

    // Resolve the imported path relative to the OLD location
    const oldDir = path.dirname(absOldPath);
    let resolvedImportPath = path.resolve(oldDir, importPath);
    
    // Check if this imported file is moving
    let newImportedPath = absoluteMap[resolvedImportPath];
    if (!newImportedPath) {
      // Maybe it didn't move, so its new path is its old path
      newImportedPath = resolvedImportPath;
    }

    // Compute the NEW relative path
    const newDir = path.dirname(absNewPath);
    let newRelativePath = path.relative(newDir, newImportedPath);
    
    // Fix slashes for JS imports
    newRelativePath = newRelativePath.replace(/\\/g, '/');
    if (!newRelativePath.startsWith('.')) {
      newRelativePath = './' + newRelativePath;
    }

    return match.replace(importPath, newRelativePath);
  });

  fileContents[absOldPath] = newContent;
}

// 4. Move files and write new contents
for (const [absOldPath, content] of Object.entries(fileContents)) {
  const isExtra = !Object.keys(fileMap).map(p => path.join(__dirname, p.replace(/\//g, path.sep))).includes(absOldPath);
  const absNewPath = isExtra ? absOldPath : absoluteMap[absOldPath];
  
  // Ensure dir exists
  fs.mkdirSync(path.dirname(absNewPath), { recursive: true });

  // Write file
  fs.writeFileSync(absNewPath, content, 'utf8');

  // Delete old file if it moved
  if (absOldPath !== absNewPath) {
    fs.unlinkSync(absOldPath);
  }
  console.log(`Processed: ${absNewPath}`);
}

// Clean up old empty directories
const dirsToClean = ['models', 'controllers', 'services', 'routes'];
dirsToClean.forEach(d => {
  const p = path.join(__dirname, d);
  if (fs.existsSync(p)) {
    try {
      // Remove empty directories
      fs.rmdirSync(p);
      console.log(`Removed empty dir: ${d}`);
    } catch (e) {
      console.log(`Could not remove dir ${d} (might not be empty)`);
    }
  }
});

console.log('Migration complete!');
