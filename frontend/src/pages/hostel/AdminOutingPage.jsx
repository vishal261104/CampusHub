import { useState, useEffect } from 'react';
import { getActiveOutings, getAllOutings, getAllLeaveRequests, reviewLeaveRequest, getHostelSettings, updateLateThreshold } from '../../api/hostel';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import {
  MapPin, CalendarDays, RefreshCw, X, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock, ArrowRight, Phone, User, AlertTriangle, Settings2
} from 'lucide-react';

const statusCfg = {
  active:    { label: 'Outside',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Returned', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending:   { label: 'Pending',  cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  approved:  { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected:  { label: 'Rejected', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

function StatusBadge({ status }) {
  const cfg = statusCfg[status] || { label: status, cls: 'bg-slate-100 text-slate-500' };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>;
}

function LateBadge() {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1">
      <AlertTriangle size={8} /> Late
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

// Checks if a given date is past the threshold (for live dashboard late indicator)
function checkIsLate(date, threshold) {
  if (!date || !threshold) return false;
  const d = new Date(date);
  const h = d.getHours();
  const m = d.getMinutes();
  return h > threshold.lateReturnHour ||
    (h === threshold.lateReturnHour && m >= threshold.lateReturnMinute);
}

function thresholdLabel(t) {
  if (!t) return '—';
  const h12 = t.lateReturnHour % 12 || 12;
  const ampm = t.lateReturnHour >= 12 ? 'PM' : 'AM';
  return `${String(h12).padStart(2, '0')}:${String(t.lateReturnMinute).padStart(2, '0')} ${ampm}`;
}

export default function AdminOutingPage() {
  const [tab, setTab]             = useState('live');
  const [liveOutings, setLive]    = useState([]);
  const [outings, setOutings]     = useState([]);
  const [leaves, setLeaves]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [leaveFilter, setLeaveFilter] = useState('');
  const [outingFilter, setOutingFilter] = useState('');
  const [expanded, setExpanded]   = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewModal, setReviewModal] = useState(null);

  // Threshold state
  const [threshold, setThreshold]       = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [thHour, setThHour]             = useState('23');
  const [thMin, setThMin]               = useState('0');
  const [savingThreshold, setSavingThreshold] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [live, hist, lv, s] = await Promise.all([
        getActiveOutings(),
        getAllOutings({ status: outingFilter || undefined }),
        getAllLeaveRequests({ status: leaveFilter || undefined }),
        getHostelSettings(),
      ]);
      setLive(live.data.outings || []);
      setOutings(hist.data.outings || []);
      setLeaves(lv.data.requests || []);
      if (s.data.settings) {
        setThreshold(s.data.settings);
        setThHour(String(s.data.settings.lateReturnHour));
        setThMin(String(s.data.settings.lateReturnMinute));
      }
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [leaveFilter, outingFilter]);

  const handleSaveThreshold = async (e) => {
    e.preventDefault();
    setSavingThreshold(true);
    try {
      const res = await updateLateThreshold({ lateReturnHour: parseInt(thHour), lateReturnMinute: parseInt(thMin) });
      setThreshold(res.data.settings);
      toast.success(`Late threshold set to ${thresholdLabel(res.data.settings)}`);
      setShowSettings(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update threshold');
    } finally {
      setSavingThreshold(false);
    }
  };

  const handleReview = async () => {
    if (!reviewModal) return;
    setReviewing(reviewModal.id);
    try {
      await reviewLeaveRequest(reviewModal.id, { action: reviewModal.action, reviewNote });
      toast.success(`Leave request ${reviewModal.action}`);
      setReviewModal(null);
      setReviewNote('');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setReviewing(null);
    }
  };

  const selectCls = "text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-200";
  const inputCls  = "px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all";

  const tabDef = [
    { id: 'live', label: `Live (${liveOutings.length})` },
    { id: 'history', label: 'Outing History' },
    { id: 'leave', label: 'Leave Requests' },
  ];

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
            <MapPin size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Outing &amp; Leave Management</h1>
            <p className="text-sm text-slate-500">
              {liveOutings.length} student{liveOutings.length !== 1 ? 's' : ''} currently outside
              {threshold && (
                <> · Late after <span className="font-semibold text-rose-500">{thresholdLabel(threshold)}</span></>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Settings2 size={14} /> Set Threshold
          </button>
          <button onClick={fetchAll} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Currently Outside', count: liveOutings.length, cls: 'bg-amber-50 border-amber-100 text-amber-700', onClick: () => setTab('live') },
          { label: 'Pending Leave',     count: leaves.filter(l => l.status === 'pending').length, cls: 'bg-sky-50 border-sky-100 text-sky-700', onClick: () => { setTab('leave'); setLeaveFilter('pending'); } },
          { label: 'Late Returns',      count: outings.filter(o => o.isLateReturn).length, cls: 'bg-rose-50 border-rose-100 text-rose-700', onClick: () => setTab('history') },
        ].map(({ label, count, cls, onClick }) => (
          <div key={label} onClick={onClick} className={`${cls} border rounded-xl px-4 py-3 text-center cursor-pointer hover:opacity-80 transition-opacity`}>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {tabDef.map(t => (
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

        // ── Live Dashboard ──
        tab === 'live' ? (
          liveOutings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400">
              <CheckCircle2 size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">All students are inside the hostel</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold px-1">Students currently outside</p>
              {liveOutings.map(o => {
                const outTime = new Date(o.outTime);
                const now = new Date();
                const minsOut = Math.floor((now - outTime) / 60000);
                const hoursOut = Math.floor(minsOut / 60);
                const durLabel = hoursOut > 0 ? `${hoursOut}h ${minsOut % 60}m` : `${minsOut}m`;
                // A live outing hasn't checked in yet — flag if current time is already past threshold
                const alreadyLate = threshold ? checkIsLate(now, threshold) : false;

                return (
                  <div key={o._id} className={`bg-white border rounded-2xl px-5 py-4 flex items-center gap-4 flex-wrap shadow-sm ${alreadyLate ? 'border-rose-200 bg-rose-50/20' : 'border-amber-200 bg-amber-50/20'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${alreadyLate ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                      <User size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">{o.studentId?.name || '—'}</p>
                        <span className="text-xs text-slate-400">{o.studentId?.studentId || ''}</span>
                        {alreadyLate && <LateBadge />}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-slate-500">
                        <span className="flex items-center gap-1"><MapPin size={10} />{o.purpose}</span>
                        <span className="flex items-center gap-1"><Clock size={10} />Out at {fmt(o.outTime)}</span>
                        <span>Expected: {o.expectedReturnTime}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[11px] rounded-lg px-2 py-1 font-semibold ${alreadyLate ? 'text-rose-600 bg-rose-100' : 'text-amber-600 bg-amber-100'}`}>
                        {durLabel} outside
                      </span>
                      <StatusBadge status="active" />
                    </div>
                  </div>
                );
              })}
            </div>
          )

        ) : tab === 'history' ? (

          // ── Outing History ──
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <select value={outingFilter} onChange={e => setOutingFilter(e.target.value)} className={selectCls}>
                <option value="">All Status</option>
                <option value="active">Outside</option>
                <option value="completed">Returned</option>
              </select>
              {outingFilter && (
                <button onClick={() => setOutingFilter('')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100">
                  <X size={12} /> Clear
                </button>
              )}
            </div>

            {outings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center text-slate-400">
                <MapPin size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No outing records</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="hidden sm:grid grid-cols-6 gap-2 px-4 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <span>Student</span><span>Purpose</span><span>Out</span><span>In</span><span>Date</span><span>Status</span>
                </div>
                {outings.map(o => (
                  <div key={o._id} className={`bg-white border rounded-2xl px-4 py-3 flex flex-wrap gap-3 items-center shadow-sm ${o.isLateReturn ? 'border-rose-100 bg-rose-50/20' : 'border-slate-200'}`}>
                    <div className="flex-1 min-w-[120px]">
                      <p className="text-sm font-semibold text-slate-800">{o.studentId?.name || '—'}</p>
                      <p className="text-xs text-slate-400">{o.studentId?.studentId}</p>
                    </div>
                    <div className="text-sm text-slate-600 flex-1">{o.purpose}</div>
                    <div className="text-sm font-mono text-slate-600 w-20">{fmt(o.outTime)}</div>
                    <div className="text-sm font-mono text-slate-600 w-20">
                      {o.inTime ? fmt(o.inTime) : <span className="text-amber-500 text-xs">Outside</span>}
                    </div>
                    <div className="text-xs text-slate-400 w-24">{fmtDate(o.outTime)}</div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={o.status} />
                      {o.isLateReturn && <LateBadge />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : (

          // ── Leave Requests ──
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {['', 'pending', 'approved', 'rejected'].map(s => (
                <button
                  key={s || 'all'}
                  onClick={() => setLeaveFilter(s)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    leaveFilter === s
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {leaves.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center text-slate-400">
                <CalendarDays size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No leave requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaves.map(l => {
                  const isOpen = expanded === l._id;
                  return (
                    <div key={l._id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      <button
                        onClick={() => setExpanded(isOpen ? null : l._id)}
                        className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-800">{l.studentId?.name || '—'}</p>
                            <span className="text-xs text-slate-400">{l.studentId?.studentId}</span>
                            <StatusBadge status={l.status} />
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                            <span>{l.reason}</span>
                            <span className="flex items-center gap-1">
                              <ArrowRight size={10} />{fmtDate(l.fromDate)} → {fmtDate(l.toDate)}
                            </span>
                            <span className="flex items-center gap-1"><Phone size={10} />{l.emergencyContact}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {l.status === 'pending' && (
                            <>
                              <button
                                onClick={e => { e.stopPropagation(); setReviewModal({ id: l._id, action: 'approved' }); }}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors"
                              >
                                <CheckCircle2 size={12} /> Approve
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setReviewModal({ id: l._id, action: 'rejected' }); }}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors"
                              >
                                <XCircle size={12} /> Reject
                              </button>
                            </>
                          )}
                          {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-4 border-t border-slate-100 pt-3 space-y-2">
                          <p className="text-xs text-slate-500"><span className="font-semibold">Email:</span> {l.studentId?.email}</p>
                          <p className="text-xs text-slate-500"><span className="font-semibold">Applied:</span> {fmtDate(l.createdAt)}</p>
                          {l.reviewNote && (
                            <p className="text-xs text-slate-700 bg-slate-50 rounded-xl px-3 py-2">
                              <span className="font-semibold text-slate-500">Note: </span>{l.reviewNote}
                            </p>
                          )}
                          {l.reviewedAt && <p className="text-xs text-slate-400">Reviewed: {fmtDate(l.reviewedAt)}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      {/* ── Set Threshold Modal ── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Late Return Threshold</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Current: <span className="font-semibold text-rose-500">{thresholdLabel(threshold)}</span>
                </p>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveThreshold} className="px-6 py-5 space-y-4">
              <p className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                Students who check in <span className="font-semibold">at or after</span> this time will be flagged as a <span className="font-semibold text-rose-600">Late Return</span>.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hour (0–23)</label>
                  <input
                    type="number" min="0" max="23" required
                    value={thHour}
                    onChange={e => setThHour(e.target.value)}
                    className={inputCls + ' w-full'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Minute (0–59)</label>
                  <input
                    type="number" min="0" max="59" required
                    value={thMin}
                    onChange={e => setThMin(e.target.value)}
                    className={inputCls + ' w-full'}
                  />
                </div>
              </div>
              {thHour && (
                <p className="text-xs text-center text-slate-500">
                  Preview: Late after <span className="font-semibold text-rose-500">
                    {String(parseInt(thHour) % 12 || 12).padStart(2, '0')}:{String(parseInt(thMin || 0)).padStart(2, '0')}{' '}
                    {parseInt(thHour) >= 12 ? 'PM' : 'AM'}
                  </span>
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowSettings(false)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={savingThreshold} className="flex-1 py-2.5 text-sm font-semibold text-white bg-rose-500 rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingThreshold && <Spinner size="xs" />}
                  Save Threshold
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setReviewModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {reviewModal.action === 'approved' ? '✅ Approve' : '❌ Reject'} Leave Request
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Add an optional note to the student</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <textarea
                rows={3} maxLength={300}
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                placeholder="Optional note for the student..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
              />
              <div className="flex gap-3">
                <button onClick={() => setReviewModal(null)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleReview}
                  disabled={!!reviewing}
                  className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    reviewModal.action === 'approved' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
                  }`}
                >
                  {reviewing ? <Spinner size="xs" /> : (reviewModal.action === 'approved' ? <CheckCircle2 size={14} /> : <XCircle size={14} />)}
                  Confirm {reviewModal.action === 'approved' ? 'Approval' : 'Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
