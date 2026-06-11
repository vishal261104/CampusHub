import { useState, useEffect } from 'react';
import { BookOpen, GraduationCap, ClipboardList, TrendingUp, Calendar, Clock, CheckCircle, AlertCircle, Home, BedDouble, FileCheck, FileX } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getEnrollments } from '../../api/enrollments';
import { getMyAttendance } from '../../api/attendance';
import { listOfferings } from '../../api/offerings';
import { getCatalog } from '../../api/courses';
import { RadialBarChart, RadialBar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

function StatCard({ label, value, sub, icon: Icon, color, loading }) {
  const colors = {
    indigo: 'bg-primary-50 text-primary-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          {loading ? <div className="h-8 w-16 bg-slate-100 rounded animate-pulse mt-2" /> : <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>}
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${colors[color] || colors.indigo}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function StudentDashboard() {
  const [enrollments, setEnrollments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      getEnrollments({ status: 'Enrolled' }),
      getMyAttendance(),
    ]).then(([enrRes, attRes]) => {
      setEnrollments(enrRes.data.enrollments || []);
      setAttendance(attRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const avgAttendance = attendance.length
    ? Math.round(attendance.reduce((s, a) => s + (a.percentage || 0), 0) / attendance.length)
    : 0;

  const chartData = attendance.slice(0, 5).map((a) => ({
    name: a.courseOffering?.courseId?.courseCode || 'Course',
    attendance: Math.round(a.percentage || 0),
  }));

  const attColor = avgAttendance >= 75 ? '#10b981' : avgAttendance >= 50 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg flex items-center justify-center">
            <span className="text-xl leading-none">👋</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Good day!</h1>
            <p className="text-sm text-slate-500 mt-0.5">Here's your academic overview</p>
          </div>
        </div>
        <hr className="mt-4 mb-6 border-slate-100" />
      </div>

      {/* Registration banner — show if student has no studentId */}
      {!user?.studentId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4 animate-slide-up">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={20} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-800">Complete your registration</h3>
            <p className="text-xs text-amber-700 mt-0.5">You need a Student ID to access hostel, attendance, and enrollment features.</p>
          </div>
          <a href="/register-student" className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-xl hover:bg-amber-700 transition-colors flex-shrink-0">
            Register Now
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Enrolled Courses" value={enrollments.length} sub="Active semester" icon={BookOpen} color="indigo" loading={loading} />
        <StatCard label="Avg Attendance" value={`${avgAttendance}%`} sub={avgAttendance >= 75 ? '✓ Good standing' : '⚠ Below threshold'} icon={ClipboardList} color={avgAttendance >= 75 ? 'emerald' : 'amber'} loading={loading} />
        <StatCard label="Courses Tracked" value={attendance.length} sub="Attendance records" icon={TrendingUp} color="sky" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attendance chart */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Attendance by Course</h3>
          {loading ? <div className="h-48 flex items-center justify-center"><Spinner /></div> : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(v) => [`${v}%`, 'Attendance']}
                />
                <Bar dataKey="attendance" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400">
              <ClipboardList size={32} className="mb-2 opacity-50" />
              <p className="text-sm">No attendance data yet</p>
            </div>
          )}
        </div>

        {/* Enrolled courses list */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">My Courses</h3>
          {loading ? <Spinner /> : enrollments.length === 0 ? (
            <p className="text-sm text-slate-400">Not enrolled in any courses</p>
          ) : (
            <div className="space-y-3">
              {enrollments.slice(0, 5).map((e) => {
                const offering = e.courseOfferingId;
                const course = offering?.courseId;
                return (
                  <div key={e._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <BookOpen size={14} className="text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{course?.courseCode}</p>
                      <p className="text-[10px] text-slate-400 truncate">{course?.courseTitle}</p>
                    </div>
                    <Badge variant="success" className="text-[10px] shrink-0">{offering?.semester}</Badge>
                  </div>
                );
              })}
              {enrollments.length > 5 && <p className="text-xs text-slate-400 text-center">+{enrollments.length - 5} more</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FacultyDashboard() {
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    listOfferings({ facultyEmail: user?.email })
      .then((res) => setOfferings(res.data.offerings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const openCount = offerings.filter((o) => o.status === 'Open').length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg flex items-center justify-center">
            <span className="text-xl leading-none">👨‍🏫</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Faculty Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your courses and attendance</p>
          </div>
        </div>
        <hr className="mt-4 mb-6 border-slate-100" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="My Offerings" value={offerings.length} sub="Total assigned" icon={BookOpen} color="indigo" loading={loading} />
        <StatCard label="Open Sections" value={openCount} sub="Currently active" icon={CheckCircle} color="emerald" loading={loading} />
        <StatCard label="Total Students" value={offerings.reduce((s, o) => s + (o.enrolledCount || 0), 0)} sub="Across all sections" icon={GraduationCap} color="sky" loading={loading} />
      </div>

      <div className="card">
        <div className="px-6 pt-5 pb-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">My Course Offerings</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {loading ? <div className="py-10 flex justify-center"><Spinner /></div>
            : offerings.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">No offerings assigned</p>
            : offerings.map((o) => (
              <div key={o._id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                    <BookOpen size={16} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{o.courseId?.courseCode} – {o.courseId?.courseTitle}</p>
                    <p className="text-xs text-slate-400">Section {o.section} · {o.semester} {o.year}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{o.enrolledCount}/{o.capacity}</span>
                  <Badge variant={o.status === 'Open' ? 'success' : 'danger'}>{o.status}</Badge>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [courses, setCourses] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCatalog({ limit: 100 }), listOfferings({ limit: 100 })])
      .then(([cRes, oRes]) => {
        setCourses(cRes.data.courses || []);
        setOfferings(oRes.data.offerings || []);
      }).finally(() => setLoading(false));
  }, []);

  const totalStudents = offerings.reduce((s, o) => s + (o.enrolledCount || 0), 0);
  const openOfferings = offerings.filter((o) => o.status === 'Open').length;

  const deptData = courses.reduce((acc, c) => {
    const d = c.department || 'Unknown';
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(deptData).map(([dept, count]) => ({ dept, count }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg flex items-center justify-center">
            <span className="text-xl leading-none">🏛️</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Admin Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">System-wide overview</p>
          </div>
        </div>
        <hr className="mt-4 mb-6 border-slate-100" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Courses" value={courses.length} icon={BookOpen} color="indigo" loading={loading} />
        <StatCard label="Offerings" value={offerings.length} icon={BookOpen} color="violet" loading={loading} />
        <StatCard label="Open Sections" value={openOfferings} icon={CheckCircle} color="emerald" loading={loading} />
        <StatCard label="Total Enrolled" value={totalStudents} icon={GraduationCap} color="sky" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Courses by Department</h3>
          {loading ? <div className="h-48 flex items-center justify-center"><Spinner /></div> : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dept" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400">No course data</p>}
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Recent Offerings</h3>
          <div className="space-y-2.5">
            {loading ? <Spinner /> : offerings.slice(0, 5).map((o) => (
              <div key={o._id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <div>
                  <p className="text-xs font-semibold text-slate-800">{o.courseId?.courseCode}</p>
                  <p className="text-[10px] text-slate-400">{o.semester} {o.year} · Sec {o.section}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{o.enrolledCount}/{o.capacity}</span>
                  <Badge variant={o.status === 'Open' ? 'success' : 'danger'}>{o.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HostelAdminDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../../api/hostel').then(({ getAllHostelApplications }) => {
      getAllHostelApplications({})
        .then((res) => setApplications(res.data.applications || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, []);

  const pending = applications.filter((a) => a.status === 'Pending').length;
  const approved = applications.filter((a) => a.status === 'Approved').length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg flex items-center justify-center">
            <Home size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Hostel Admin Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage hostel applications and rooms</p>
          </div>
        </div>
        <hr className="mt-4 mb-6 border-slate-100" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Applications" value={applications.length} sub="All time" icon={Home} color="indigo" loading={loading} />
        <StatCard label="Pending Review" value={pending} sub="Awaiting action" icon={ClipboardList} color="amber" loading={loading} />
        <StatCard label="Approved" value={approved} sub="Currently housed" icon={CheckCircle} color="emerald" loading={loading} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href="/hostel/admin" className="card p-6 hover:shadow-md transition-shadow flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 transition-colors">
            <FileCheck size={22} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Review Applications</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {loading ? '...' : `${pending} application${pending !== 1 ? 's' : ''} pending`}
            </p>
          </div>
        </a>
        <a href="/hostel/rooms" className="card p-6 hover:shadow-md transition-shadow flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
            <BedDouble size={22} className="text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Manage Rooms</p>
            <p className="text-sm text-slate-500 mt-0.5">Create, update, and view room occupancy</p>
          </div>
        </a>
      </div>

      {applications.filter((a) => a.status === 'Pending').length > 0 && (
        <div className="card">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Recent Pending Applications</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {applications.filter((a) => a.status === 'Pending').slice(0, 5).map((app) => (
              <div key={app._id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-800">{app.studentId?.name || '—'}</p>
                  <p className="text-xs text-slate-400">{app.hostel} · Room {app.roomNumber} · {app.roomCategory}</p>
                </div>
                <span className="text-xs font-mono text-slate-400">{app.hostelApplicationNumber}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === 'student') return <StudentDashboard />;
  if (user?.role === 'faculty') return <FacultyDashboard />;
  if (user?.role === 'hostelAdmin') return <HostelAdminDashboard />;
  return <AdminDashboard />;
}
