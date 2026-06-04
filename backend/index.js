import express from 'express';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import 'dotenv/config';


const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'API is running',
    routes: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        ping: 'GET /api/auth',
      },
      users: {
        me: 'GET /api/users/me',
        updateMe: 'PATCH /api/users/me',
        updatePassword: 'PATCH /api/users/me/password',
        setRoleById: 'PATCH /api/users/:id/role',
        setRoleByEmail: 'PATCH /api/users/role',
      },
      courses: {
        listAll: 'GET /api/courses/catalog',
        createCourse: 'POST /api/courses/course',
        getCourse: 'GET /api/courses/course/:id',
        updateCourse: 'PUT /api/courses/course/:id',
        deleteCourse: 'DELETE /api/courses/course/:id',
        createOffering: 'POST /api/courses/course-offering',
        listOfferings: 'GET /api/courses/course-offerings',
        getOffering: 'GET /api/courses/course-offering/:id',
        updateOffering: 'PUT /api/courses/course-offering/:id',
        deleteOffering: 'DELETE /api/courses/course-offering/:id',
        assignFaculty: 'PATCH /api/courses/course-offering/:id/faculty',
        catalog: 'GET /api/courses/course-catalog',
      },
      enrollments: {
        enroll: 'POST /api/enrollments/enroll/:id',
        drop: 'DELETE /api/enrollments/drop/:id',
        list: 'GET /api/enrollments',
        timetable: 'GET /api/enrollments/timetable',
      },
      attendance: {
        getAttendance: 'GET /api/attendance/my/',
        markAttendance: 'POST /api/attendance/mark',
        getEnrolledStudents: 'GET /api/attendance/students/:courseOfferingId/',
        getCourseAttendance: 'GET /api/attendance/course-offering/:courseOfferingId/',
      },
    },
  });
});


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});
app.use(errorHandler);


const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Server link: http://localhost:' + PORT);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err?.message || err);
    if (err && typeof err === 'object') {
      console.error('Error name:', err.name);
      if ('code' in err) console.error('Error code:', err.code);
      if ('codeName' in err) console.error('Error codeName:', err.codeName);
    }
    process.exit(1);
  });
