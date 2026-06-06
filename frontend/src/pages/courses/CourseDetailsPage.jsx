import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, Users, FileText, GraduationCap } from 'lucide-react';
import { getCourse } from '../../api/courses';
import { getCourseCatalog } from '../../api/offerings';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';

const DEPT_COLORS = { CSE: 'indigo', ECE: 'sky', ME: 'emerald', Humanities: 'amber' };

export default function CourseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const [courseRes, offeringsRes] = await Promise.all([
          getCourse(id),
          getCourseCatalog({ courseCode: '' }).catch(() => ({ data: { offerings: [] } })),
        ]);
        const c = courseRes.data; // The backend returns the course directly, not wrapped in { course: ... }
        setCourse(c);
        // Fetch offerings for this specific course using its code
        const off = await getCourseCatalog({ courseCode: c.courseCode }).catch(() => ({ data: { offerings: [] } }));
        setOfferings(off.data.offerings || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!course) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-slate-800">Course Not Found</h2>
        <button onClick={() => navigate('/courses/catalog')} className="text-primary-600 hover:underline mt-2">Return to Catalog</button>
      </div>
    );
  }

  const badgeColor = DEPT_COLORS[course.department] || 'default';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate('/courses/catalog')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={16} /> Back to Catalog
      </button>

      {/* Course Header */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-lg uppercase tracking-wider">{course.courseCode}</span>
              <Badge variant={badgeColor}>{course.department}</Badge>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">{course.courseTitle}</h1>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-2xl font-bold text-slate-800">{course.credits}</span>
            <span className="text-slate-500 block text-sm">Credits</span>
          </div>
        </div>
        <p className="text-slate-600 leading-relaxed">{course.description || 'No description provided.'}</p>
      </div>

      {/* Active Offerings */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <GraduationCap size={16} className="text-slate-400" />
          <p className="text-sm font-semibold text-slate-800">Available Offerings</p>
          <span className="ml-auto text-xs text-slate-400">{offerings.length} offering{offerings.length !== 1 ? 's' : ''}</span>
        </div>
        {offerings.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Clock size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No active offerings for this course</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {offerings.map((o, i) => (
              <div key={o._id || i} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={15} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Section {o.section} · {o.semester} {o.year}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Faculty: {o.facultyId?.name || 'TBA'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{o.enrolledCount || 0} / {o.capacity} seats</p>
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${Math.min(100, ((o.enrolledCount || 0) / (o.capacity || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <Badge variant={o.status === 'Open' ? 'success' : 'danger'}>{o.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Placeholders */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center min-h-[120px] text-slate-400">
          <div className="text-center">
            <FileText size={22} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Syllabus & Prerequisites Coming Soon</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center min-h-[120px] text-slate-400">
          <div className="text-center">
            <Users size={22} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Attendance Metrics Coming Soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}

