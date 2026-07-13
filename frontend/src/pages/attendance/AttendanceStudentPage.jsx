import { useState, useEffect } from 'react';
import { ClipboardList, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { getMyAttendance } from '../../api/attendance';
import { RadialBarChart, RadialBar, ResponsiveContainer, Cell } from 'recharts';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

function AttendanceRing({ percentage }) {
  const color = percentage >= 75 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="100%" startAngle={90} endAngle={-270} data={[{ value: percentage }]}>
          <RadialBar dataKey="value" background={{ fill: '#f1f5f9' }} cornerRadius={10}>
            <Cell fill={color} />
          </RadialBar>
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-slate-700">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}

export default function AttendanceStudentPage() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyAttendance()
      .then((res) => setAttendance(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const overall = attendance.length
    ? Math.round(attendance.reduce((s, a) => s + (a.percentage || 0), 0) / attendance.length)
    : 0;

  const atRisk = attendance.filter((a) => a.percentage < 75).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">My Attendance</h2>
        <p className="text-slate-500 text-sm">Track your attendance across all enrolled courses</p>
      </div>

      {}
      {!loading && attendance.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overall Average</p>
            <p className="text-3xl font-bold mt-1" style={{ color: overall >= 75 ? '#10b981' : overall >= 50 ? '#f59e0b' : '#f43f5e' }}>{overall}%</p>
            <p className="text-xs text-slate-400">{overall >= 75 ? '✓ Good standing' : '⚠ Below threshold'}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Courses Tracked</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{attendance.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">At Risk</p>
            <p className="text-3xl font-bold mt-1" style={{ color: atRisk > 0 ? '#f43f5e' : '#10b981' }}>{atRisk}</p>
            <p className="text-xs text-slate-400">Courses below 75%</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : attendance.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No attendance records yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {attendance.map((item, i) => {
            const pct = Math.round(item.percentage || 0);
            const variant = pct >= 75 ? 'success' : pct >= 50 ? 'warning' : 'danger';
            return (
              <div key={i} className="card p-5 flex items-center gap-4 hover:shadow-md transition-all">
                <AttendanceRing percentage={pct} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.courseOffering?.courseId?.courseTitle || 'Unknown'}</p>
                      <p className="text-xs text-slate-400">{item.courseOffering?.courseId?.courseCode} · {item.courseOffering?.semester} {item.courseOffering?.year}</p>
                    </div>
                    <Badge variant={variant}>{pct >= 75 ? '✓ OK' : pct >= 50 ? '⚠ Low' : '✗ Critical'}</Badge>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{item.presentClasses} / {item.totalClasses} classes attended</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e',
                        }}
                      />
                    </div>
                    {pct < 75 && (
                      <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
                        <AlertCircle size={10} />
                        Need {Math.ceil((0.75 * item.totalClasses - item.presentClasses) / (1 - 0.75))} more classes to reach 75%
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
