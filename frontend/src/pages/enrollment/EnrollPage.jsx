import { useState, useEffect } from 'react';
import { Search, GraduationCap, Check, X, Filter, ChevronDown } from 'lucide-react';
import { getCourseCatalog } from '../../api/offerings';
import { enrollInCourse, dropCourse, getEnrollments } from '../../api/enrollments';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

const SEMESTERS = ['Spring', 'Summer', 'Fall', 'Winter'];

export default function EnrollPage() {
  const [offerings, setOfferings] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState('Fall');
  const [year, setYear] = useState(new Date().getFullYear());
  const [actionId, setActionId] = useState(null);

  const fetchOfferings = async () => {
    setLoading(true);
    try {
      const [offerRes, enrRes] = await Promise.all([
        getCourseCatalog({ semester, year }),
        getEnrollments({ status: 'Enrolled' }),
      ]);
      setOfferings(offerRes.data.offerings || []);
      setEnrollments(enrRes.data.enrollments || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load courses');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchOfferings(); }, [semester, year]);

  const enrolledIds = new Set(enrollments.map((e) => e.courseOfferingId?._id || e.courseOfferingId));

  const handleEnroll = async (offeringId) => {
    setActionId(offeringId);
    try {
      await enrollInCourse(offeringId);
      toast.success('Enrolled successfully!');
      fetchOfferings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Enrollment failed');
    } finally { setActionId(null); }
  };

  const handleDrop = async (offeringId) => {
    setActionId(offeringId);
    try {
      await dropCourse(offeringId);
      toast.success('Course dropped');
      fetchOfferings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to drop');
    } finally { setActionId(null); }
  };

  const filtered = offerings.filter((o) => {
    const course = o.courseId;
    const q = search.toLowerCase();
    return !q || course?.courseCode?.toLowerCase().includes(q) || course?.courseTitle?.toLowerCase().includes(q) || course?.department?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Enroll in Courses</h2>
        <p className="text-slate-500 text-sm">Browse available offerings and manage your enrollment</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white w-52" />
        </div>
        <select value={semester} onChange={(e) => setSemester(e.target.value)} className="form-input w-auto py-2">
          {SEMESTERS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="form-input w-auto py-2">
          {[2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
        </select>
        <Badge variant="default">{filtered.length} results</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <GraduationCap size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No offerings found for {semester} {year}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((o) => {
            const course = o.courseId || {};
            const isEnrolled = enrolledIds.has(o._id);
            const isFull = o.enrolledCount >= o.capacity;
            const isClosed = o.status === 'Closed';
            const isProcessing = actionId === o._id;
            const fillPct = Math.min(100, Math.round((o.enrolledCount / o.capacity) * 100));

            return (
              <div key={o._id} className={`card p-5 flex flex-col gap-3 transition-all hover:shadow-md ${isEnrolled ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{course.courseCode}</p>
                    <h3 className="text-sm font-semibold text-slate-900 leading-tight mt-0.5">{course.courseTitle}</h3>
                  </div>
                  <Badge variant={isClosed ? 'danger' : isEnrolled ? 'success' : 'primary'}>
                    {isClosed ? 'Closed' : isEnrolled ? 'Enrolled' : 'Open'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div><span className="font-medium">Faculty:</span> {o.facultyId?.name || '—'}</div>
                  <div><span className="font-medium">Credits:</span> {course.credits}</div>
                  <div><span className="font-medium">Section:</span> {o.section}</div>
                  <div><span className="font-medium">Dept:</span> {course.department || '—'}</div>
                </div>

                {o.meetings?.length > 0 && (
                  <div className="text-xs text-slate-400 space-y-0.5">
                    {o.meetings.map((m, i) => (
                      <div key={i}>{m.day} {m.startTime}–{m.endTime} · {m.building} {m.room}</div>
                    ))}
                  </div>
                )}

                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Enrollment</span>
                    <span>{o.enrolledCount}/{o.capacity}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${fillPct >= 100 ? 'bg-rose-500' : fillPct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${fillPct}%` }} />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  {isEnrolled ? (
                    <Button variant="danger" size="sm" className="flex-1" loading={isProcessing} onClick={() => handleDrop(o._id)}>
                      <X size={13} /> Drop Course
                    </Button>
                  ) : (
                    <Button size="sm" className="flex-1" disabled={isClosed || isFull || isProcessing} loading={isProcessing} onClick={() => handleEnroll(o._id)}>
                      <Check size={13} /> {isFull ? 'Full' : 'Enroll'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
