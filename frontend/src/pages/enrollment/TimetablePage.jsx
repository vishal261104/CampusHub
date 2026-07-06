import { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, MapPin, AlertTriangle, Download } from 'lucide-react';
import { getTimetable } from '../../api/enrollments';
import { useReactToPrint } from 'react-to-print';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SEMESTERS = ['Spring', 'Summer', 'Fall', 'Winter'];
const COLORS = ['bg-primary-100 border-primary-300 text-primary-800', 'bg-emerald-100 border-emerald-300 text-emerald-800', 'bg-amber-100 border-amber-300 text-amber-800', 'bg-sky-100 border-sky-300 text-sky-800', 'bg-violet-100 border-violet-300 text-violet-800', 'bg-rose-100 border-rose-300 text-rose-800'];

export default function TimetablePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState('');
  const [year, setYear] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const timetableRef = useRef(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const params = {};
      if (semester) params.semester = semester;
      if (year) params.year = year;
      const res = await getTimetable(params);
      setData(res.data);
    } catch { setData(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [semester, year]);

  const courseColorMap = {};
  let colorIdx = 0;
  const getCourseColor = (code) => {
    if (!courseColorMap[code]) { courseColorMap[code] = COLORS[colorIdx % COLORS.length]; colorIdx++; }
    return courseColorMap[code];
  };

  const handleDownloadPDF = useReactToPrint({
    contentRef: timetableRef,
    documentTitle: 'My_Timetable',
    onBeforePrint: () => {
      setIsDownloading(true);
      return Promise.resolve();
    },
    onAfterPrint: () => setIsDownloading(false),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Timetable</h2>
          <p className="text-slate-500 text-sm">{data?.totalCourses ?? 0} courses · {data?.totalClassBlocks ?? 0} class blocks/week</p>
        </div>
        <div className="flex gap-3 items-center">
          <select value={semester} onChange={(e) => setSemester(e.target.value)} className="form-input w-auto py-2 text-sm">
            <option value="">All Semesters</option>
            {SEMESTERS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="form-input w-auto py-2 text-sm">
            <option value="">All Years</option>
            {[2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
          </select>
          <button 
            onClick={handleDownloadPDF} 
            disabled={isDownloading || !data || data.totalClassBlocks === 0}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? <Spinner size="sm" className="text-white" /> : <Download size={16} />}
            {isDownloading ? 'Exporting...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {data?.conflicts?.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Schedule Conflicts Detected</p>
            {data.conflicts.map((c, i) => (
              <p key={i} className="text-xs text-amber-600 mt-0.5">{c.day}: {c.first.courseCode} overlaps with {c.second.courseCode}</p>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : !data || data.totalClassBlocks === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <Calendar size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No classes scheduled</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          {}
          <div ref={timetableRef} className="min-w-[800px] p-4 bg-white print:p-0 print:w-full">
            <h2 className="text-xl font-bold text-slate-900 mb-4 hidden print:block">My Weekly Timetable</h2>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 print:bg-slate-100">
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-24 border-r border-slate-200 text-center">Time</th>
                  {DAYS.map(day => (
                    <th key={day} className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-r border-slate-200 last:border-r-0 w-1/5">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '08:00 - 09:00', start: '08:00', end: '09:00' },
                  { label: '09:00 - 10:00', start: '09:00', end: '10:00' },
                  { label: '10:00 - 11:00', start: '10:00', end: '11:00' },
                  { label: '11:00 - 12:00', start: '11:00', end: '12:00' },
                  { label: '12:00 - 13:00', start: '12:00', end: '13:00' },
                  { label: '13:00 - 14:00', start: '13:00', end: '14:00' },
                  { label: '14:00 - 15:00', start: '14:00', end: '15:00' },
                  { label: '15:00 - 16:00', start: '15:00', end: '16:00' },
                  { label: '16:00 - 17:00', start: '16:00', end: '17:00' },
                  { label: '17:00 - 18:00', start: '17:00', end: '18:00' },
                ].map((slot, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-2 text-xs font-semibold text-slate-500 text-center border-r border-slate-100 bg-slate-50/30 whitespace-nowrap">
                      {slot.label}
                    </td>
                    {DAYS.map(day => {
                      const classes = data.weekly?.[day] || [];
                      const cls = classes.find(c => c.startTime < slot.end && c.endTime > slot.start);
                      
                      return (
                        <td key={`${day}-${rowIndex}`} className="p-2 border-r border-slate-100 last:border-r-0 align-top h-[80px]">
                          {cls ? (
                            <div className={`h-full p-2 rounded-lg border-l-4 ${getCourseColor(cls.courseCode)} shadow-sm flex flex-col justify-center print:border-l-4 print:border-slate-800`}>
                              <p className="text-[11px] font-bold leading-tight">{cls.courseCode}</p>
                              <p className="text-[9px] mt-0.5 truncate opacity-80 print:whitespace-normal" title={cls.courseTitle}>{cls.courseTitle}</p>
                              <div className="flex items-center gap-1 mt-1 text-[9px] opacity-75">
                                <MapPin size={9} />
                                <span className="truncate">{cls.building} {cls.room}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full min-h-[40px]"></div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {}
      {data?.courses?.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Enrolled Courses</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.courses.map((c, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COLORS[i % COLORS.length].split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500')}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800">{c.courseCode}</p>
                  <p className="text-[10px] text-slate-400 truncate">{c.courseTitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
