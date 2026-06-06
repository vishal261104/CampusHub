import { useState, useEffect } from 'react';
import { Check, X, ChevronDown, Users, CalendarCheck } from 'lucide-react';
import { listOfferings } from '../../api/offerings';
import { getEnrolledStudents, markAttendance, getCourseAttendance } from '../../api/attendance';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function AttendanceFacultyPage() {
  const { user } = useAuth();
  const [offerings, setOfferings] = useState([]);
  const [selectedOffering, setSelectedOffering] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [existingAttendance, setExistingAttendance] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('mark');

  useEffect(() => {
    listOfferings({ facultyEmail: user?.email })
      .then((res) => setOfferings(res.data.offerings || []))
      .finally(() => setLoadingOfferings(false));
  }, [user]);

  const loadStudents = async (offeringId) => {
    setLoadingStudents(true);
    try {
      const [studRes, attRes] = await Promise.all([
        getEnrolledStudents(offeringId),
        getCourseAttendance(offeringId),
      ]);
      const studs = studRes.data.students || [];
      setStudents(studs);
      setExistingAttendance(attRes.data.attendance || []);
      const defaultAtt = {};
      studs.forEach((s) => { defaultAtt[s._id] = 'Present'; });
      setAttendance(defaultAtt);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load students');
    } finally { setLoadingStudents(false); }
  };

  const handleOfferingSelect = (o) => {
    setSelectedOffering(o);
    loadStudents(o._id);
  };

  const handleMarkAll = (status) => {
    const updated = {};
    students.forEach((s) => { updated[s._id] = status; });
    setAttendance(updated);
  };

  const handleSubmit = async () => {
    if (!selectedOffering || !date) return;
    setSaving(true);
    let success = 0, failed = 0;
    for (const student of students) {
      try {
        await markAttendance({
          courseOfferingId: selectedOffering._id,
          studentId: student._id,
          status: attendance[student._id] || 'Absent',
          date,
        });
        success++;
      } catch { failed++; }
    }
    setSaving(false);
    if (success > 0) toast.success(`Attendance marked for ${success} student(s)`);
    if (failed > 0) toast.error(`${failed} record(s) already marked or failed`);

    // Refresh the attendance history so the panel updates live
    try {
      const attRes = await getCourseAttendance(selectedOffering._id);
      setExistingAttendance(attRes.data.attendance || []);
    } catch { /* ignore */ }

    if (success > 0) window.location.reload();
  };

  const todayAttendance = existingAttendance.filter((a) => {
    const aDate = new Date(a.date).toISOString().split('T')[0];
    return aDate === date;
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Mark Attendance</h2>
        <p className="text-slate-500 text-sm">Select a course offering to take attendance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sidebar: Offerings */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">My Course Offerings</p>
          </div>
          {loadingOfferings ? (
            <div className="py-10 flex justify-center"><Spinner /></div>
          ) : offerings.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No offerings assigned</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {offerings.map((o) => (
                <button
                  key={o._id}
                  onClick={() => handleOfferingSelect(o)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors ${selectedOffering?._id === o._id ? 'bg-primary-50 border-l-2 border-primary-500' : ''}`}
                >
                  <p className="text-sm font-medium text-slate-800">{o.courseId?.courseCode}</p>
                  <p className="text-xs text-slate-400">{o.semester} {o.year} · Sec {o.section}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Users size={11} className="text-slate-400" />
                    <span className="text-[10px] text-slate-400">{o.enrolledCount} enrolled</span>
                    <Badge variant={o.status === 'Open' ? 'success' : 'danger'} className="text-[9px] ml-auto">{o.status}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main: Mark attendance */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedOffering ? (
            <div className="card py-20 text-center text-slate-400">
              <CalendarCheck size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a course offering to take attendance</p>
            </div>
          ) : (
            <>
              <div className="card p-5">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{selectedOffering.courseId?.courseCode} – {selectedOffering.courseId?.courseTitle}</p>
                    <p className="text-xs text-slate-400">Section {selectedOffering.section} · {selectedOffering.semester} {selectedOffering.year}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-input py-2 text-sm w-auto" />
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <button onClick={() => handleMarkAll('Present')} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors flex items-center gap-1">
                    <Check size={12} /> Mark All Present
                  </button>
                  <button onClick={() => handleMarkAll('Absent')} className="text-xs px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-medium transition-colors flex items-center gap-1">
                    <X size={12} /> Mark All Absent
                  </button>
                </div>

                {loadingStudents ? (
                  <div className="py-8 flex justify-center"><Spinner /></div>
                ) : students.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">No students enrolled</p>
                ) : (
                  <>
                    {todayAttendance.length > 0 && (
                      <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
                        <CalendarCheck size={14} />
                        Attendance already submitted for this date. Resubmitting will attempt to update existing records.
                      </div>
                    )}
                    <div className="space-y-2">
                      {students.map((s) => (
                        <div key={s._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-xs font-semibold text-primary-700">{s.name?.charAt(0)?.toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{s.name}</p>
                              <p className="text-xs text-slate-400">{s.email}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setAttendance({ ...attendance, [s._id]: 'Present' })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${attendance[s._id] === 'Present' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:border-emerald-300'}`}
                            >
                              <Check size={12} /> Present
                            </button>
                            <button
                              onClick={() => setAttendance({ ...attendance, [s._id]: 'Absent' })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${attendance[s._id] === 'Absent' ? 'bg-rose-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:border-rose-300'}`}
                            >
                              <X size={12} /> Absent
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {students.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      {Object.values(attendance).filter((v) => v === 'Present').length} present · {Object.values(attendance).filter((v) => v === 'Absent').length} absent
                    </p>
                    <Button loading={saving} onClick={handleSubmit}>
                      <CalendarCheck size={15} /> Submit Attendance
                    </Button>
                  </div>
                )}
              </div>

              {/* Existing records */}
              {existingAttendance.length > 0 && (
                <div className="card">
                  <div className="px-5 py-3.5 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-800">Attendance History</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {existingAttendance.slice(0, 10).map((a, i) => (
                      <div key={i} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{a.studentId?.name}</p>
                          <p className="text-xs text-slate-400">{new Date(a.date).toLocaleDateString()}</p>
                        </div>
                        <Badge variant={a.status === 'Present' ? 'success' : 'danger'}>{a.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
