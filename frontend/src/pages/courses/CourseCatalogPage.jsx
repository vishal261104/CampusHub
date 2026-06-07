import { useState, useEffect } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { getCatalog } from '../../api/courses';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

export default function CourseCatalogPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchCourses = async (p = 1, q = '', d = '') => {
    setLoading(true);
    try {
      const res = await getCatalog({ page: p, limit, search: q, department: d });
      setCourses(res.data.courses || []);
      setTotal(res.data.count || 0);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses(page, search, department);
  }, [page, search, department]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleDepartmentChange = (e) => {
    setDepartment(e.target.value);
    setPage(1);
  };

  const deptColors = ['indigo', 'sky', 'emerald', 'amber', 'violet', 'rose'];
  const deptColorMap = {};
  let deptIdx = 0;
  const getColor = (dept) => {
    if (!dept) return 'default';
    if (!deptColorMap[dept]) { deptColorMap[dept] = deptColors[deptIdx % deptColors.length]; deptIdx++; }
    return deptColorMap[dept];
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Course Catalog</h2>
          <p className="text-slate-500 text-sm mt-0.5">{total} courses available</p>
        </div>
        <div className="flex gap-3">
          <select
            value={department}
            onChange={handleDepartmentChange}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white transition-all"
          >
            <option value="">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Physics">Physics</option>
            <option value="Electronics">Electronics</option>
            <option value="Mechanical">Mechanical</option>
          </select>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white w-64 transition-all"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div
              key={course._id}
              onClick={() => navigate(`/courses/${course._id}`)}
              className="card p-5 hover:shadow-md transition-all group cursor-pointer flex flex-col"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
                  <BookOpen size={18} className="text-primary-600" />
                </div>
                <Badge variant={getColor(course.department)}>{course.department || 'General'}</Badge>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-1 leading-tight">{course.courseTitle}</h3>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">{course.courseCode}</p>

              {course.description && (
                <p className="text-xs text-slate-500 mt-3 line-clamp-2">{course.description}</p>
              )}

              <div className="mt-4 flex-grow">
                <div className="grid grid-cols-2 gap-y-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Department</span>
                    <span className="font-medium text-slate-700">{course.department || '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Credits</span>
                    <span className="font-medium text-slate-700">{course.credits} cr</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/courses/${course._id}`); }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  View Details
                </button>
                <span className="text-xs text-slate-400 font-medium">{course.credits} Credits</span>
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="col-span-3 py-16 text-center text-slate-400">
              <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p>No courses match your search</p>
            </div>
          )}
        </div>
      )}

      {!loading && total > limit && (
        <div className="flex justify-center gap-2 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-4 py-2 disabled:opacity-40">Previous</button>
          <span className="flex items-center text-sm text-slate-500">Page {page} of {Math.ceil(total / limit)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / limit)} className="btn-secondary text-sm px-4 py-2 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
