import { useState, useEffect, useCallback } from 'react';
import {
  getAllFeeStructures, getAcademicYears,
  createFeeStructure, updateFeeStructure,
  archiveFeeStructure, restoreFeeStructure,
  getActiveSemester, activateSemester, deactivateSemester, updateActiveDueDate,
  getAllFeeRecords, updatePayment, syncFeeRecords,
} from '../../api/fee';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import {
  IndianRupee, Plus, RefreshCw, Pencil, Archive, RotateCcw,
  X, ChevronDown, BookOpen, Home, ClipboardList, Library, Wrench,
  CalendarDays, Zap, ZapOff, Users, CheckCircle2, Clock, AlertTriangle, RotateCw
} from 'lucide-react';


const CATEGORIES = ['Tuition Fee', 'Hostel Fee', 'Exam Fee', 'Library Fee', 'Other'];
const SEMESTERS  = ['Spring', 'Summer', 'Fall', 'Winter'];

const SEMESTER_COLOR = {
  Spring: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Summer: 'bg-amber-50  text-amber-700  border-amber-100',
  Fall:   'bg-orange-50 text-orange-700 border-orange-100',
  Winter: 'bg-sky-50    text-sky-700    border-sky-100',
};

const CATEGORY_META = {
  'Tuition Fee': { icon: BookOpen,      color: 'bg-sky-50 text-sky-700 border-sky-100' },
  'Hostel Fee':  { icon: Home,          color: 'bg-violet-50 text-violet-700 border-violet-100' },
  'Exam Fee':    { icon: ClipboardList, color: 'bg-amber-50 text-amber-700 border-amber-100' },
  'Library Fee': { icon: Library,       color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  'Other':       { icon: Wrench,        color: 'bg-slate-50 text-slate-600 border-slate-200' },
};

const STATUS_CFG = {
  Paid:    { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  Partial: { cls: 'bg-amber-50  text-amber-700  border-amber-200',  icon: Clock },
  Pending: { cls: 'bg-rose-50   text-rose-700   border-rose-200',   icon: AlertTriangle },
};

const EMPTY_FORM = { category: 'Tuition Fee', label: '', amount: '', year: new Date().getFullYear().toString(), semester: 'Fall', description: '' };
const EMPTY_SEM  = { semester: 'Fall', year: new Date().getFullYear().toString(), dueDate: '' };

function fmtINR(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function autoLabel(category, semester, year) {
  return `${category} – ${semester} ${year}`;
}


function CategoryBadge({ category }) {
  const meta = CATEGORY_META[category] || CATEGORY_META['Other'];
  const Icon = meta.icon;
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.color}`}><Icon size={11} />{category}</span>;
}
function SemBadge({ semester }) {
  const cls = SEMESTER_COLOR[semester] || 'bg-slate-50 text-slate-600 border-slate-200';
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>{semester}</span>;
}


function ActiveSemesterPanel({ active, onActivate, onDeactivate, onUpdateDue, loading }) {
  const [showModal, setShowModal] = useState(false);
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_SEM);
  const [newDue, setNewDue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleActivate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onActivate({ semester: form.semester, year: parseInt(form.year), dueDate: form.dueDate });
      setShowModal(false);
    } finally { setSaving(false); }
  };

  const handleUpdateDue = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateDue(newDue);
      setShowDueDateModal(false);
    } finally { setSaving(false); }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 bg-white';

  return (
    <>
      <div className={`rounded-2xl border px-5 py-4 flex items-center justify-between flex-wrap gap-3 ${
        active ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
            <Zap size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              {active ? `Active Semester: ${active.semester} ${active.year}` : 'No Active Semester'}
            </p>
            {active ? (
              <p className="text-xs text-slate-500 mt-0.5">Fee due: {fmtDate(active.dueDate)}</p>
            ) : (
              <p className="text-xs text-slate-400">Activate a semester so students can see their fee dashboard</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {active && (
            <>
              <button onClick={() => { setNewDue(''); setShowDueDateModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-100 rounded-xl hover:bg-sky-100 transition-colors">
                <CalendarDays size={12} /> Update Due Date
              </button>
              <button onClick={onDeactivate} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors disabled:opacity-50">
                <ZapOff size={12} /> Deactivate
              </button>
            </>
          )}
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors">
            <Zap size={12} /> {active ? 'Switch Semester' : 'Activate Semester'}
          </button>
        </div>
      </div>

      {}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div><h2 className="text-lg font-bold text-slate-900">Activate Semester</h2>
                <p className="text-xs text-slate-400 mt-0.5">Students will see this semester on their fee dashboard</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleActivate} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Semester</label>
                  <select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} className={inputCls}>
                    {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Year</label>
                  <input type="number" required min="2000" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fee Due Date</label>
                <input type="date" required value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className={inputCls} />
              </div>
              {active && <p className="text-[11px] text-amber-600 bg-amber-50 rounded-xl px-3 py-2">⚠ This will deactivate <strong>{active.semester} {active.year}</strong> and activate the new one.</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Spinner size="xs" />} Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {showDueDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDueDateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Update Due Date</h2>
              <button onClick={() => setShowDueDateModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            </div>
            <form onSubmit={handleUpdateDue} className="px-6 py-5 space-y-4">
              <input type="date" required value={newDue} onChange={e => setNewDue(e.target.value)} className={inputCls} />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowDueDateModal(false)} className="flex-1 py-2 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 text-sm font-semibold text-white bg-sky-600 rounded-xl hover:bg-sky-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Spinner size="xs" />} Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


function StudentRecordsTab({ active }) {
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [statusFilter, setStatus]   = useState('');
  const [editModal, setEditModal]   = useState(null); 
  const [newPaid, setNewPaid]       = useState('');
  const [payNote, setPayNote]       = useState('');
  const [saving, setSaving]         = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await getAllFeeRecords(params);
      setRecords(res.data.records || []);
    } catch { toast.error('Failed to load records'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleSync = async () => {
    if (!active) return toast.error('No active semester to sync');
    setSyncing(true);
    try {
      const res = await syncFeeRecords();
      toast.success(res.data.message);
      fetchRecords();
    } catch (err) { toast.error(err.response?.data?.message || 'Sync failed'); }
    finally { setSyncing(false); }
  };

  const openEdit = (record) => {
    setEditModal(record);
    setNewPaid(String(record.paidAmount));
    setPayNote(record.paymentNote || '');
  };

  const handleSavePayment = async () => {
    setSaving(true);
    try {
      const res = await updatePayment(editModal._id, { paidAmount: parseFloat(newPaid), paymentNote: payNote });
      setRecords(prev => prev.map(r => r._id === editModal._id ? res.data.record : r));
      toast.success('Payment updated');
      setEditModal(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  if (!active) return (
    <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center text-slate-400">
      <Users size={32} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm">Activate a semester to view student fee records</p>
    </div>
  );

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 bg-white';

  return (
    <div className="space-y-4">
      {}
      <div className="flex items-center gap-2 flex-wrap">
        {['', 'Pending', 'Partial', 'Paid'].map(s => (
          <button key={s || 'all'} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              statusFilter === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
            }`}>
            {s || 'All'}
          </button>
        ))}
        <div className="ml-auto">
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50">
            {syncing ? <Spinner size="xs" /> : <RotateCw size={12} />} Sync All Students
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center text-slate-400">
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No records yet — click "Sync All Students" to generate them</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-6 gap-2 px-4 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span className="col-span-2">Student</span><span>Total</span><span>Paid</span><span>Pending</span><span>Status</span>
          </div>
          {records.map(r => {
            const pending = r.totalAmount - r.paidAmount;
            const cfg = STATUS_CFG[r.status] || STATUS_CFG['Pending'];
            const Ico = cfg.icon;
            return (
              <div key={r._id} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap shadow-sm hover:border-slate-300 transition-colors">
                <div className="flex-1 min-w-[140px]">
                  <p className="text-sm font-semibold text-slate-800">{r.studentId?.name || '—'}</p>
                  <p className="text-xs text-slate-400">{r.studentId?.studentId || r.studentId?.email}</p>
                </div>
                <p className="text-sm text-slate-600 w-24 font-mono">{fmtINR(r.totalAmount)}</p>
                <p className="text-sm text-emerald-600 w-24 font-mono">{fmtINR(r.paidAmount)}</p>
                <p className={`text-sm w-24 font-mono ${pending > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtINR(pending)}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${cfg.cls}`}>
                    <Ico size={8} />{r.status}
                  </span>
                  <button onClick={() => openEdit(r)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                    <Pencil size={10} /> Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Update Payment</h2>
                <p className="text-xs text-slate-400 mt-0.5">{editModal.studentId?.name} · Total: {fmtINR(editModal.totalAmount)}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Paid Amount (₹)</label>
                <input type="number" min="0" max={editModal.totalAmount} step="0.01"
                  value={newPaid} onChange={e => setNewPaid(e.target.value)} className={inputCls} />
                <p className="text-[10px] text-slate-400 mt-1">Max: {fmtINR(editModal.totalAmount)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Note <span className="font-normal text-slate-400">(optional)</span></label>
                <input type="text" placeholder="e.g. Paid via DD on 15 June"
                  value={payNote} onChange={e => setPayNote(e.target.value)} className={inputCls} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
                <button onClick={handleSavePayment} disabled={saving}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Spinner size="xs" />} Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function FeeFormModal({ mode, initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const isEdit = mode === 'edit';

  const set = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'category' || field === 'semester' || field === 'year') {
        const prevAuto = autoLabel(prev.category, prev.semester, prev.year);
        if (!prev.label || prev.label === prevAuto) {
          next.label = autoLabel(
            field === 'category' ? value : prev.category,
            field === 'semester' ? value : prev.semester,
            field === 'year'     ? value : prev.year,
          );
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) return toast.error('Label is required');
    if (!form.year || isNaN(Number(form.year))) return toast.error('Enter a valid year');
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) < 0) return toast.error('Enter a valid amount');
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount), year: parseInt(form.year, 10) };
      let res;
      if (isEdit) { res = await updateFeeStructure(initial._id, payload); toast.success('Updated'); }
      else { res = await createFeeStructure(payload); toast.success('Created'); }
      onSaved(res.data.fee);
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 bg-white';
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div><h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Fee Structure' : 'New Fee Structure'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{isEdit ? 'Update the fee details' : 'Define a new fee for a semester'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Semester</label>
              <select value={form.semester} onChange={e => set('semester', e.target.value)} className={inputCls}>
                {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Year</label>
              <input type="number" required min="2000" max="2100" value={form.year} onChange={e => set('year', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Label</label>
            <input type="text" required maxLength={150} value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder={autoLabel(form.category, form.semester, form.year)} className={inputCls} />
            <p className="text-[10px] text-slate-400 mt-1">Auto-filled — customize if needed</p>
          </div>
          <div>
            <label className={labelCls}>Amount (₹)</label>
            <input type="number" required min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="75000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea rows={2} maxLength={500} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls + ' resize-none'} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Spinner size="xs" />}{isEdit ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export default function FeeStructurePage() {
  const [tab, setTab]             = useState('structures'); 
  const [fees, setFees]           = useState([]);
  const [years, setYears]         = useState([]);
  const [active, setActive]       = useState(null);       
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [archiving, setArchiving] = useState(null);
  const [restoring, setRestoring] = useState(null);

  const [filterYear, setFilterYear]     = useState('');
  const [filterSem, setFilterSem]       = useState('');
  const [filterCat, setFilterCat]       = useState('');
  const [filterActive, setFilterActive] = useState('true');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = { isActive: filterActive };
      if (filterYear) params.year     = filterYear;
      if (filterSem)  params.semester = filterSem;
      if (filterCat)  params.category = filterCat;
      const [feesRes, yearsRes, semRes] = await Promise.all([
        getAllFeeStructures(params),
        getAcademicYears(),
        getActiveSemester(),
      ]);
      setFees(feesRes.data.fees || []);
      setYears(yearsRes.data.years || []);
      setActive(semRes.data.activeSemester || null);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [filterYear, filterSem, filterCat, filterActive]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSavedFee = (fee) => {
    setFees(prev => {
      const idx = prev.findIndex(f => f._id === fee._id);
      if (idx >= 0) { const n = [...prev]; n[idx] = fee; return n; }
      return [fee, ...prev];
    });
    if (!years.includes(fee.year)) setYears(prev => [...new Set([...prev, fee.year])].sort((a, b) => b - a));
  };

  const handleActivate = async (data) => {
    try {
      const res = await activateSemester(data);
      setActive(res.data.activeSemester);
      toast.success(res.data.message);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to activate'); throw err; }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Deactivate the current semester? Students will no longer see fee dashboard.')) return;
    try {
      await deactivateSemester();
      setActive(null);
      toast.success('Semester deactivated');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleUpdateDue = async (dueDate) => {
    try {
      const res = await updateActiveDueDate({ dueDate });
      setActive(res.data.activeSemester);
      toast.success('Due date updated');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); throw err; }
  };

  const handleArchive = async (fee) => {
    if (!window.confirm(`Archive "${fee.label}"?`)) return;
    setArchiving(fee._id);
    try {
      const res = await archiveFeeStructure(fee._id);
      handleSavedFee(res.data.fee);
      toast.success('Archived');
    } catch (err) { toast.error(err.response?.data?.message || 'Archive failed'); }
    finally { setArchiving(null); }
  };

  const handleRestore = async (fee) => {
    setRestoring(fee._id);
    try {
      const res = await restoreFeeStructure(fee._id);
      handleSavedFee(res.data.fee);
      toast.success('Restored');
    } catch (err) { toast.error(err.response?.data?.message || 'Restore failed'); }
    finally { setRestoring(null); }
  };

  const activeCount   = fees.filter(f => f.isActive).length;
  const archivedCount = fees.filter(f => !f.isActive).length;
  const totalAmount   = fees.filter(f => f.isActive).reduce((s, f) => s + f.amount, 0);
  const selectCls = 'text-sm border border-slate-200 rounded-xl px-3 pr-7 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-200 appearance-none cursor-pointer';

  return (
    <div className="space-y-5">
      {}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><IndianRupee size={20} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Fee Structures</h1>
            <p className="text-sm text-slate-500">Manage semester fees and student payments</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
          {tab === 'structures' && (
            <button onClick={() => setModal({ mode: 'create' })} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">
              <Plus size={14} /> New Fee Structure
            </button>
          )}
        </div>
      </div>

      {}
      <ActiveSemesterPanel active={active} onActivate={handleActivate} onDeactivate={handleDeactivate} onUpdateDue={handleUpdateDue} loading={loading} />

      {}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl px-5 py-4">
          <p className="text-2xl font-bold">{activeCount}</p>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mt-0.5">Active</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 text-slate-600 rounded-xl px-5 py-4">
          <p className="text-2xl font-bold">{archivedCount}</p>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mt-0.5">Archived</p>
        </div>
        <div className="bg-sky-50 border border-sky-100 text-sky-700 rounded-xl px-5 py-4">
          <p className="text-2xl font-bold">{fmtINR(totalAmount)}</p>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mt-0.5">Total Active</p>
        </div>
      </div>

      {}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[['structures', 'Fee Structures'], ['records', 'Student Records']].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === 'records' ? (
        <StudentRecordsTab active={active} />
      ) : (
        <>
          {}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {[['true', 'Active'], ['false', 'Archived'], ['all', 'All']].map(([val, lbl]) => (
                <button key={val} onClick={() => setFilterActive(val)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    filterActive === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>{lbl}
                </button>
              ))}
            </div>
            <div className="relative">
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className={selectCls}>
                <option value="">All Years</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={filterSem} onChange={e => setFilterSem(e.target.value)} className={selectCls}>
                <option value="">All Semesters</option>
                {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={selectCls}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {(filterYear || filterSem || filterCat || filterActive !== 'true') && (
              <button onClick={() => { setFilterYear(''); setFilterSem(''); setFilterCat(''); setFilterActive('true'); }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={12} /> Clear
              </button>
            )}
          </div>

          {}
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : fees.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400">
              <IndianRupee size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No fee structures found</p>
              {filterActive === 'true' && (
                <button onClick={() => setModal({ mode: 'create' })} className="mt-3 text-sm text-emerald-600 hover:underline">Create your first fee structure</button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {fees.map(fee => {
                const meta = CATEGORY_META[fee.category] || CATEGORY_META['Other'];
                const Icon = meta.icon;
                const isActiveSem = active?.semester === fee.semester && active?.year === fee.year;
                return (
                  <div key={fee._id}
                    className={`bg-white rounded-2xl border shadow-sm flex flex-col transition-all hover:shadow-md ${
                      fee.isActive ? (isActiveSem ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200') : 'border-dashed border-slate-300 opacity-70'
                    }`}>
                    {isActiveSem && fee.isActive && (
                      <div className="px-5 pt-3 flex">
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                          <Zap size={8} /> Active Semester
                        </span>
                      </div>
                    )}
                    <div className="px-5 pt-4 pb-3 flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${meta.color}`}><Icon size={16} /></div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm leading-tight">{fee.label}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <CategoryBadge category={fee.category} />
                          <SemBadge semester={fee.semester} />
                        </div>
                      </div>
                    </div>
                    <div className="px-5 pb-4 flex-1">
                      <p className="text-2xl font-bold text-slate-900">{fmtINR(fee.amount)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {fee.semester} {fee.year}
                        {!fee.isActive && <span className="ml-2 text-rose-400 font-semibold">· Archived</span>}
                      </p>
                      {fee.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{fee.description}</p>}
                    </div>
                    <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                      <p className="text-[10px] text-slate-400">By {fee.createdBy?.name || '—'}</p>
                      <div className="flex gap-1.5">
                        {fee.isActive ? (
                          <>
                            <button onClick={() => setModal({ mode: 'edit', data: { ...fee, year: String(fee.year), amount: String(fee.amount) } })}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
                              <Pencil size={11} /> Edit
                            </button>
                            <button onClick={() => handleArchive(fee)} disabled={archiving === fee._id}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 disabled:opacity-50">
                              {archiving === fee._id ? <Spinner size="xs" /> : <Archive size={11} />} Archive
                            </button>
                          </>
                        ) : (
                          <button onClick={() => handleRestore(fee)} disabled={restoring === fee._id}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 disabled:opacity-50">
                            {restoring === fee._id ? <Spinner size="xs" /> : <RotateCcw size={11} />} Restore
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {modal && (
        <FeeFormModal mode={modal.mode} initial={modal.data || null} onClose={() => setModal(null)} onSaved={handleSavedFee} />
      )}
    </div>
  );
}
