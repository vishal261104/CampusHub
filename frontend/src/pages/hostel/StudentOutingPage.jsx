import { useState, useEffect } from 'react';
import {
  createOuting, checkIn, getMyOutings,
  createLeaveRequest, getMyLeaveRequests, getHostelSettings,
} from '../../api/hostel';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import {
  MapPin, X, Plus, Clock, CheckCircle2, AlertTriangle,
  CalendarDays, Phone, Send, ChevronDown, ChevronUp, ArrowRight
} from 'lucide-react';

const TABS = ['outings', 'leave'];

const statusCfg = {
  active:    { label: 'Outside',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Returned',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending:   { label: 'Pending',   cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  approved:  { label: 'Approved',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected:  { label: 'Rejected',  cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

function StatusBadge({ status }) {
  const cfg = statusCfg[status] || { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const OUTING_INIT = { purpose: '', expectedReturnTime: '' };
const LEAVE_INIT  = { reason: '', fromDate: '', toDate: '', emergencyContact: '' };

export default function StudentOutingPage() {
  const [tab, setTab]             = useState('outings');
  const [outings, setOutings]     = useState([]);
  const [leaves, setLeaves]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeOuting, setActive] = useState(null);

  const [showOutingForm, setShowOutingForm] = useState(false);
  const [showLeaveForm, setShowLeaveForm]   = useState(false);
  const [outingForm, setOutingForm]         = useState(OUTING_INIT);
  const [leaveForm, setLeaveForm]           = useState(LEAVE_INIT);
  const [saving, setSaving]                 = useState(false);
  const [checkingIn, setCheckingIn]         = useState(false);
  const [expanded, setExpanded]             = useState(null);
  const [threshold, setThreshold]           = useState({ lateReturnHour: 23, lateReturnMinute: 0 });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [o, l, s] = await Promise.all([getMyOutings(), getMyLeaveRequests(), getHostelSettings()]);
      const allOutings = o.data.outings || [];
      setOutings(allOutings);
      setActive(allOutings.find(x => x.status === 'active') || null);
      setLeaves(l.data.requests || []);
      if (s.data.settings) setThreshold(s.data.settings);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleOuting = async (e) => {
    e.preventDefault();
    if (!outingForm.purpose.trim() || !outingForm.expectedReturnTime) return toast.error('All fields required');
    setSaving(true);
    try {
      await createOuting(outingForm);
      toast.success('Outing created! Have a safe trip.');
      setShowOutingForm(false);
      setOutingForm(OUTING_INIT);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create outing');
    } finally { setSaving(false); }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await checkIn();
      toast.success(res.data.message);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally { setCheckingIn(false); }
  };

  const handleLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.reason.trim() || !leaveForm.fromDate || !leaveForm.toDate || !leaveForm.emergencyContact.trim())
      return toast.error('All fields are required');
    setSaving(true);
    try {
      await createLeaveRequest(leaveForm);
      toast.success('Leave request submitted!');
      setShowLeaveForm(false);
      setLeaveForm(LEAVE_INIT);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit leave request');
    } finally { setSaving(false); }
  };

  const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all";
  const labelCls = "block text-xs font-semibold text-slate-600 mb-1.5";

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
            <MapPin size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Outing &amp; Leave</h1>
            <p className="text-sm text-slate-500">
              Track your movements · Late return after{' '}
              <span className="font-semibold text-rose-500">
                {String(threshold.lateReturnHour % 12 || 12).padStart(2, '0')}:{String(threshold.lateReturnMinute).padStart(2, '0')}{' '}
                {threshold.lateReturnHour >= 12 ? 'PM' : 'AM'}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowOutingForm(true)}
            disabled={!!activeOuting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-sky-500 rounded-xl hover:bg-sky-600 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MapPin size={14} /> New Outing
          </button>
          <button
            onClick={() => setShowLeaveForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-500 rounded-xl hover:bg-violet-600 transition-colors shadow-sm"
          >
            <CalendarDays size={14} /> Leave Request
          </button>
        </div>
      </div>

      {}
      {activeOuting && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <MapPin size={18} />
            </div>
            <div>
              <p className="font-semibold text-amber-800">You are currently outside the hostel</p>
              <p className="text-sm text-amber-600">
                Purpose: {activeOuting.purpose} · Out since {fmt(activeOuting.outTime)} · Expected back: {activeOuting.expectedReturnTime}
              </p>
            </div>
          </div>
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {checkingIn ? <Spinner size="xs" /> : <CheckCircle2 size={14} />}
            Mark Return
          </button>
        </div>
      )}

      {}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[{ id: 'outings', label: 'Day Outings' }, { id: 'leave', label: 'Leave Requests' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (

        
        tab === 'outings' ? (
          outings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400">
              <MapPin size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No outing history yet</p>
              <button onClick={() => setShowOutingForm(true)} className="mt-3 text-sm text-sky-500 hover:underline">
                Create your first outing
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {}
              <div className="hidden sm:grid grid-cols-5 gap-3 px-4 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <span>Date</span><span>Purpose</span><span>Out</span><span>In</span><span>Status</span>
              </div>
              {outings.map(o => (
                <div key={o._id} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-wrap gap-3 items-center justify-between shadow-sm">
                  <div className="text-sm text-slate-500 w-24">{fmtDate(o.outTime)}</div>
                  <div className="flex-1 min-w-[100px]">
                    <p className="text-sm font-medium text-slate-800">{o.purpose}</p>
                    <p className="text-[11px] text-slate-400">Expected: {o.expectedReturnTime}</p>
                  </div>
                  <div className="text-sm text-slate-600 font-mono w-20">{fmt(o.outTime)}</div>
                  <div className="text-sm text-slate-600 font-mono w-20">
                    {o.inTime ? fmt(o.inTime) : <span className="text-amber-500 text-xs">Outside</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={o.status} />
                    {o.isLateReturn && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                        Late
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )

        ) : (

          
          leaves.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400">
              <CalendarDays size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No leave requests yet</p>
              <button onClick={() => setShowLeaveForm(true)} className="mt-3 text-sm text-violet-500 hover:underline">
                Apply for leave
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {leaves.map(l => {
                const isOpen = expanded === l._id;
                return (
                  <div key={l._id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <button
                      onClick={() => setExpanded(isOpen ? null : l._id)}
                      className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <CalendarDays size={16} className="text-violet-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800 truncate">{l.reason}</p>
                          <StatusBadge status={l.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <ArrowRight size={10} />
                            {fmtDate(l.fromDate)} → {fmtDate(l.toDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone size={10} /> {l.emergencyContact}
                          </span>
                          <span>Applied: {fmtDate(l.createdAt)}</span>
                        </div>
                      </div>
                      {isOpen ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
                    </button>
                    {isOpen && l.reviewNote && (
                      <div className="px-5 pb-4 border-t border-slate-100 pt-3">
                        <p className="text-xs font-semibold text-slate-500 mb-1">Admin Note:</p>
                        <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2">{l.reviewNote}</p>
                        {l.reviewedAt && <p className="text-[11px] text-slate-400 mt-1">Reviewed: {fmtDate(l.reviewedAt)}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )
      )}

      {}
      {showOutingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowOutingForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">New Day Outing</h2>
                <p className="text-xs text-slate-400 mt-0.5">Must return the same day</p>
              </div>
              <button onClick={() => setShowOutingForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleOuting} className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Purpose</label>
                <input type="text" required maxLength={200} value={outingForm.purpose}
                  onChange={e => setOutingForm(f => ({ ...f, purpose: e.target.value }))}
                  placeholder="e.g. Shopping, Bank work"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Expected Return Time</label>
                <input type="time" required value={outingForm.expectedReturnTime}
                  onChange={e => setOutingForm(f => ({ ...f, expectedReturnTime: e.target.value }))}
                  className={inputCls} />
                <p className="text-[11px] text-slate-400 mt-1">You must be back before end of day.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowOutingForm(false)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-semibold text-white bg-sky-500 rounded-xl hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Spinner size="xs" />} Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {showLeaveForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowLeaveForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Overnight Leave Request</h2>
                <p className="text-xs text-slate-400 mt-0.5">Requires hostel admin approval</p>
              </div>
              <button onClick={() => setShowLeaveForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleLeave} className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Reason</label>
                <textarea required maxLength={500} rows={3} value={leaveForm.reason}
                  onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Reason for leave..."
                  className={`${inputCls} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>From Date</label>
                  <input type="date" required value={leaveForm.fromDate}
                    onChange={e => setLeaveForm(f => ({ ...f, fromDate: e.target.value }))}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>To Date</label>
                  <input type="date" required value={leaveForm.toDate}
                    onChange={e => setLeaveForm(f => ({ ...f, toDate: e.target.value }))}
                    className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Emergency Contact</label>
                <input type="tel" required maxLength={15} value={leaveForm.emergencyContact}
                  onChange={e => setLeaveForm(f => ({ ...f, emergencyContact: e.target.value }))}
                  placeholder="Parent/Guardian phone number"
                  className={inputCls} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowLeaveForm(false)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-semibold text-white bg-violet-500 rounded-xl hover:bg-violet-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Spinner size="xs" />}
                  <Send size={14} /> Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
