import { useState, useEffect, useCallback } from 'react';
import {
  Plus, ChevronDown, Upload, BarChart2, Send, Trash2,
  Eye, CheckCircle, FileText, AlertTriangle, X, Edit2,
  TrendingUp, Users, Award, Target
} from 'lucide-react';
import {
  createAssessment, updateAssessment, advanceAssessmentStatus,
  deleteAssessment, bulkUploadMarks, getOfferingAssessments,
  getAssessmentMarks, getAssessmentAnalytics
} from '../../api/assessments';
import { listOfferings } from '../../api/offerings';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const ASSESSMENT_TYPES = ['Assignment', 'Quiz', 'MidExam', 'EndExam', 'Lab', 'Viva', 'Project'];

const TYPE_COLORS = {
  Assignment: 'bg-blue-100 text-blue-700',
  Quiz: 'bg-purple-100 text-purple-700',
  MidExam: 'bg-amber-100 text-amber-700',
  EndExam: 'bg-red-100 text-red-700',
  Lab: 'bg-emerald-100 text-emerald-700',
  Viva: 'bg-pink-100 text-pink-700',
  Project: 'bg-indigo-100 text-indigo-700',
};

const STATUS_CONFIG = {
  Draft: { color: 'bg-slate-100 text-slate-600', label: 'Draft', next: 'Move to Review' },
  Review: { color: 'bg-amber-100 text-amber-700', label: 'In Review', next: 'Publish Results' },
  Published: { color: 'bg-emerald-100 text-emerald-700', label: 'Published', next: null },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function parseCsvRows(csvText) {
  const lines = csvText.trim().split('\n').filter(Boolean);
  const rows = [];
  for (const line of lines) {
    const parts = line.split(',').map(p => p.trim());
    const studentId = parts[0];
    const isAbsent = parts[1]?.toLowerCase() === 'absent' || parts[1]?.toLowerCase() === 'true';
    const marksObtained = isAbsent ? 0 : parseFloat(parts[1]);
    const remarks = parts[2] || '';
    if (studentId) rows.push({ studentId, marksObtained, isAbsent, remarks });
  }
  return rows;
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color = 'text-slate-700', sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
        <Icon size={14} />
        {label}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

// ─── DISTRIBUTION BAR ─────────────────────────────────────────────────────────

function DistributionBar({ distribution, total }) {
  const max = Math.max(...distribution.map(d => d.count), 1);
  return (
    <div className="space-y-2">
      {distribution.map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-16 text-right text-slate-500 text-xs font-medium shrink-0">{d.label}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-700"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <span className="w-8 text-xs text-slate-600 font-bold">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── ANALYTICS PANEL ─────────────────────────────────────────────────────────

function AnalyticsPanel({ assessmentId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getAssessmentAnalytics(assessmentId);
        setData(res.data);
      } catch {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, [assessmentId]);

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <Spinner size="lg" />
    </div>
  );

  const { stats, distribution, topPerformers, assessment } = data || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">{assessment?.title}</h2>
            <p className="text-xs text-slate-400">{assessment?.type} · {assessment?.totalMarks} marks</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6">
          {!stats ? (
            <div className="text-center py-8 text-slate-400">No marks data available yet.</div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Highest" value={stats.highest} icon={TrendingUp} color="text-emerald-600" />
                <StatCard label="Average" value={stats.average} icon={BarChart2} color="text-sky-600" />
                <StatCard label="Median" value={stats.median} icon={Target} color="text-violet-600" />
                <StatCard label="Pass Rate" value={`${stats.passPercentage}%`} icon={CheckCircle} color="text-blue-600" sub={`${stats.passed}/${stats.total} students`} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard label="Lowest" value={stats.lowest} icon={AlertTriangle} color="text-rose-500" />
                <StatCard label="Appeared" value={stats.total} icon={Users} />
                <StatCard label="Absent" value={stats.absentCount} icon={X} color="text-slate-400" />
              </div>

              {/* Distribution */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3">Score Distribution</h3>
                <DistributionBar distribution={distribution} total={stats.total} />
              </div>

              {/* Top Performers */}
              {topPerformers?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><Award size={16} className="text-amber-500" /> Top Performers</h3>
                  <div className="space-y-2">
                    {topPerformers.map(p => (
                      <div key={p.rank} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                        <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${p.rank === 1 ? 'bg-amber-400 text-white' : p.rank === 2 ? 'bg-slate-300 text-slate-700' : p.rank === 3 ? 'bg-orange-300 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {p.rank}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">{p.student?.name}</p>
                          <p className="text-xs text-slate-400">{p.student?.studentId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{p.marks}</p>
                          <p className="text-xs text-slate-400">{p.percentage}%</p>
                        </div>
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

// ─── MARKS VIEW PANEL ────────────────────────────────────────────────────────

function MarksPanel({ assessmentId, assessmentTitle, totalMarks, onClose }) {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getAssessmentMarks(assessmentId);
        setMarks(res.data.marks);
      } catch {
        toast.error('Failed to load marks');
      } finally {
        setLoading(false);
      }
    })();
  }, [assessmentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-slate-900">{assessmentTitle} — Marks</h2>
            <p className="text-xs text-slate-400">Total: {totalMarks} marks</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>
        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>
        ) : marks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">No marks uploaded yet.</div>
        ) : (
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-center">Marks</th>
                  <th className="px-4 py-3 text-center">%</th>
                  <th className="px-4 py-3 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {marks.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{m.studentId?.name}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{m.studentId?.studentId}</td>
                    <td className="px-4 py-2.5 text-center">
                      {m.isAbsent ? (
                        <span className="text-xs font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">Absent</span>
                      ) : (
                        <span className="font-bold text-slate-900">{m.marksObtained}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-500 text-xs">
                      {m.isAbsent ? '—' : `${((m.marksObtained / totalMarks) * 100).toFixed(1)}%`}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{m.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BULK UPLOAD MODAL ────────────────────────────────────────────────────────

function BulkUploadModal({ assessment, enrolledStudents, onClose, onSuccess }) {
  const [csvText, setCsvText] = useState('');
  const [rows, setRows] = useState(enrolledStudents.map(s => ({
    studentId: s._id,
    name: s.name,
    studentCode: s.studentId,
    marksObtained: '',
    isAbsent: false,
    remarks: '',
  })));
  const [mode, setMode] = useState('table'); // 'table' | 'csv'
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleTableSubmit = async () => {
    setLoading(true);
    setErrors([]);
    try {
      const payload = rows.map(r => ({
        studentId: r.studentId,
        marksObtained: r.isAbsent ? 0 : parseFloat(r.marksObtained),
        isAbsent: r.isAbsent,
        remarks: r.remarks,
      }));
      const res = await bulkUploadMarks(assessment._id, payload);
      const { errors: errs, result } = res.data;
      if (errs?.length) setErrors(errs);
      toast.success(`Uploaded ${result.upserted + result.modified} mark(s)`);
      if (!errs?.length) { onSuccess(); onClose(); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvSubmit = async () => {
    const parsed = parseCsvRows(csvText);
    if (parsed.length === 0) { toast.error('No valid rows found in CSV'); return; }
    setLoading(true);
    setErrors([]);
    try {
      const res = await bulkUploadMarks(assessment._id, parsed);
      const { errors: errs, result } = res.data;
      if (errs?.length) setErrors(errs);
      toast.success(`Uploaded ${result.upserted + result.modified} mark(s)`);
      if (!errs?.length) { onSuccess(); onClose(); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-slate-900">Upload Marks</h2>
            <p className="text-xs text-slate-400">{assessment.title} · Max: {assessment.totalMarks}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm">
              <button onClick={() => setMode('table')} className={`px-3 py-1.5 font-medium transition-colors ${mode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Table</button>
              <button onClick={() => setMode('csv')} className={`px-3 py-1.5 font-medium transition-colors ${mode === 'csv' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>CSV Paste</button>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X size={18} /></button>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="px-6 py-3 bg-rose-50 border-b border-rose-100">
            <p className="text-xs font-semibold text-rose-700 mb-1">Upload Errors:</p>
            {errors.map((e, i) => <p key={i} className="text-xs text-rose-600">{e}</p>)}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {mode === 'table' ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-center w-28">Absent?</th>
                  <th className="px-4 py-3 text-center w-28">Marks</th>
                  <th className="px-4 py-3 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={r.studentId} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{r.name}</td>
                    <td className="px-4 py-2 text-slate-400 text-xs">{r.studentCode}</td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={r.isAbsent}
                        onChange={e => {
                          const next = [...rows];
                          next[i] = { ...next[i], isAbsent: e.target.checked, marksObtained: e.target.checked ? '' : next[i].marksObtained };
                          setRows(next);
                        }}
                        className="w-4 h-4 accent-rose-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      {r.isAbsent ? (
                        <span className="text-xs text-slate-300">—</span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          max={assessment.totalMarks}
                          value={r.marksObtained}
                          onChange={e => {
                            const next = [...rows];
                            next[i] = { ...next[i], marksObtained: e.target.value };
                            setRows(next);
                          }}
                          className="w-20 text-center border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                          placeholder="0"
                        />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={r.remarks}
                        onChange={e => {
                          const next = [...rows];
                          next[i] = { ...next[i], remarks: e.target.value };
                          setRows(next);
                        }}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        placeholder="Optional"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 font-mono">
                <p className="font-semibold text-slate-700 mb-2">Format: studentId, marksObtained, remarks</p>
                <p>64f3e2b1c..., 42, Good work</p>
                <p>64f3e2b2c..., absent, Absent</p>
                <p>64f3e2b3c..., 38,</p>
              </div>
              <textarea
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                rows={12}
                className="w-full font-mono text-sm border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                placeholder="Paste CSV data here..."
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3 bg-white">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            loading={loading}
            onClick={mode === 'table' ? handleTableSubmit : handleCsvSubmit}
          >
            <Upload size={16} /> Upload Marks
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── ASSESSMENT FORM MODAL ────────────────────────────────────────────────────

function AssessmentFormModal({ offering, editData, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: editData?.title || '',
    type: editData?.type || 'Assignment',
    totalMarks: editData?.totalMarks || '',
    passingMarks: editData?.passingMarks || '',
    weightage: editData?.weightage || '',
    dueDate: editData?.dueDate ? editData.dueDate.split('T')[0] : '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editData) {
        await updateAssessment(editData._id, form);
        toast.success('Assessment updated');
      } else {
        await createAssessment(offering._id, form);
        toast.success('Assessment created');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save assessment');
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, type = 'text', props = {}) => (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full form-input"
        {...props}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-slate-900">{editData ? 'Edit Assessment' : 'New Assessment'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {field('title', 'Assessment Title', 'text', { required: true, placeholder: 'e.g. Mid Semester Exam' })}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="form-input w-full">
              {ASSESSMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('totalMarks', 'Total Marks', 'number', { required: true, min: 1 })}
            {field('passingMarks', 'Passing Marks', 'number', { required: true, min: 0 })}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('weightage', 'Weightage (%)', 'number', { required: true, min: 0, max: 100 })}
            {field('dueDate', 'Due Date (optional)', 'date')}
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading} className="flex-1">{editData ? 'Save Changes' : 'Create Assessment'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ASSESSMENT CARD ──────────────────────────────────────────────────────────

function AssessmentCard({ assessment, enrolledStudents, onRefresh }) {
  const [showUpload, setShowUpload] = useState(false);
  const [showMarks, setShowMarks] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const statusCfg = STATUS_CONFIG[assessment.status];

  const handleAdvance = async () => {
    const action = statusCfg.next;
    if (!action) return;
    if (!window.confirm(`${action}? This action cannot be undone.`)) return;
    setAdvancing(true);
    try {
      await advanceAssessmentStatus(assessment._id);
      toast.success(`Assessment moved to ${assessment.status === 'Draft' ? 'Review' : 'Published'}`);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setAdvancing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this assessment and all its marks?')) return;
    setDeleting(true);
    try {
      await deleteAssessment(assessment._id);
      toast.success('Assessment deleted');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-md transition-all duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[assessment.type]}`}>
                {assessment.type}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-base leading-tight truncate">{assessment.title}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span>Max: <b className="text-slate-600">{assessment.totalMarks}</b></span>
              <span>Pass: <b className="text-slate-600">{assessment.passingMarks}</b></span>
              <span>Weight: <b className="text-slate-600">{assessment.weightage}%</b></span>
              <span>{assessment.markCount ?? 0} marks uploaded</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {assessment.status !== 'Published' && (
              <button onClick={() => setShowEdit(true)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title="Edit">
                <Edit2 size={14} />
              </button>
            )}
            {assessment.status !== 'Published' && (
              <button onClick={() => setShowUpload(true)} className="p-2 rounded-xl hover:bg-sky-50 text-slate-400 hover:text-sky-600 transition-colors" title="Upload Marks">
                <Upload size={14} />
              </button>
            )}
            <button onClick={() => setShowMarks(true)} className="p-2 rounded-xl hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-colors" title="View Marks">
              <Eye size={14} />
            </button>
            {assessment.status === 'Published' && (
              <button onClick={() => setShowAnalytics(true)} className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors" title="Analytics">
                <BarChart2 size={14} />
              </button>
            )}
            {statusCfg.next && (
              <button
                onClick={handleAdvance}
                disabled={advancing}
                className={`p-2 rounded-xl transition-colors text-sm font-semibold ${assessment.status === 'Review' ? 'hover:bg-emerald-50 hover:text-emerald-600 text-slate-400' : 'hover:bg-amber-50 hover:text-amber-600 text-slate-400'}`}
                title={statusCfg.next}
              >
                {advancing ? <Spinner size="sm" /> : <Send size={14} />}
              </button>
            )}
            {assessment.status === 'Draft' && (
              <button onClick={handleDelete} disabled={deleting} className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors" title="Delete">
                {deleting ? <Spinner size="sm" /> : <Trash2 size={14} />}
              </button>
            )}
          </div>
        </div>

        {/* Status Progress Bar */}
        <div className="mt-3 flex items-center gap-1">
          {['Draft', 'Review', 'Published'].map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                ['Draft', 'Review', 'Published'].indexOf(assessment.status) >= i
                  ? s === 'Published' ? 'bg-emerald-500' : s === 'Review' ? 'bg-amber-400' : 'bg-slate-300'
                  : 'bg-slate-100'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Modals */}
      {showEdit && (
        <AssessmentFormModal
          offering={{ _id: assessment.courseOfferingId }}
          editData={assessment}
          onClose={() => setShowEdit(false)}
          onSuccess={onRefresh}
        />
      )}
      {showUpload && (
        <BulkUploadModal
          assessment={assessment}
          enrolledStudents={enrolledStudents}
          onClose={() => setShowUpload(false)}
          onSuccess={onRefresh}
        />
      )}
      {showMarks && (
        <MarksPanel
          assessmentId={assessment._id}
          assessmentTitle={assessment.title}
          totalMarks={assessment.totalMarks}
          onClose={() => setShowMarks(false)}
        />
      )}
      {showAnalytics && (
        <AnalyticsPanel
          assessmentId={assessment._id}
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </>
  );
}

// ─── OFFERING PANEL ───────────────────────────────────────────────────────────

function OfferingPanel({ offering }) {
  const [assessments, setAssessments] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchAssessments = useCallback(async () => {
    try {
      const res = await getOfferingAssessments(offering._id);
      setAssessments(res.data.assessments);
    } catch {
      toast.error('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }, [offering._id]);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);

  // Fetch enrolled students for bulk upload
  useEffect(() => {
    import('../../api/attendance').then(({ getEnrolledStudents }) => {
      getEnrolledStudents(offering._id)
        .then(res => setEnrolledStudents(res.data.students || []))
        .catch(() => {});
    });
  }, [offering._id]);

  const totalWeightage = assessments.reduce((s, a) => s + (a.weightage || 0), 0);
  const publishedCount = assessments.filter(a => a.status === 'Published').length;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="px-2 py-0.5 bg-slate-100 rounded-full font-semibold">{assessments.length} assessments</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">{publishedCount} published</span>
            <span className={`px-2 py-0.5 rounded-full font-semibold ${totalWeightage > 100 ? 'bg-rose-100 text-rose-700' : totalWeightage === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {totalWeightage}% total weightage
            </span>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New Assessment
        </Button>
      </div>

      {/* Assessment list */}
      {loading ? (
        <div className="py-8 flex justify-center"><Spinner size="lg" /></div>
      ) : assessments.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
          <FileText size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No assessments yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first assessment to get started</p>
          <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Create Assessment
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {assessments.map(a => (
            <AssessmentCard
              key={a._id}
              assessment={a}
              enrolledStudents={enrolledStudents}
              onRefresh={fetchAssessments}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <AssessmentFormModal
          offering={offering}
          editData={null}
          onClose={() => setShowCreate(false)}
          onSuccess={fetchAssessments}
        />
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function FacultyAssessmentsPage() {
  const [offerings, setOfferings] = useState([]);
  const [selectedOffering, setSelectedOffering] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await listOfferings({ myOfferings: true });
        const list = res.data.offerings || res.data || [];
        setOfferings(list);
        if (list.length > 0) setSelectedOffering(list[0]);
      } catch {
        toast.error('Failed to load your course offerings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <div className="py-20 flex justify-center"><Spinner size="lg" /></div>
  );

  if (offerings.length === 0) return (
    <div className="py-20 text-center text-slate-400">
      <Target size={40} className="mx-auto mb-4 opacity-30" />
      <p className="font-semibold text-lg">No Course Offerings</p>
      <p className="text-sm mt-1">You are not assigned to any course offerings yet.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Assessments & Marks</h1>
        <p className="text-slate-500 text-sm mt-0.5">Create assessments, upload marks in bulk, and publish results for your students.</p>
      </div>

      {/* Offering Selector */}
      <div className="flex flex-wrap gap-2">
        {offerings.map(o => (
          <button
            key={o._id}
            onClick={() => setSelectedOffering(o)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 border ${
              selectedOffering?._id === o._id
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            {o.courseId?.courseTitle || o.courseId?.courseCode || 'Course'} — {o.semester} {o.year} §{o.section}
          </button>
        ))}
      </div>

      {/* Selected Offering Panel */}
      {selectedOffering && (
        <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">{selectedOffering.courseId?.courseTitle}</h2>
              <p className="text-xs text-slate-400">
                {selectedOffering.courseId?.courseCode} · {selectedOffering.semester} {selectedOffering.year} · Section {selectedOffering.section}
              </p>
            </div>
          </div>
          <OfferingPanel key={selectedOffering._id} offering={selectedOffering} />
        </div>
      )}
    </div>
  );
}
