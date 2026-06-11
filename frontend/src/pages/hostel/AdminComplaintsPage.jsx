import { useState, useEffect } from 'react';
import { getAllComplaints, updateComplaintStatus, assignComplaint, addComplaintComment } from '../../api/hostel';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import {
  AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Send,
  CheckCircle2, Loader2, User, MessageSquare, X
} from 'lucide-react';

const STATUSES    = ['Open', 'In Progress', 'Resolved'];
const CATEGORIES  = ['Electrical', 'Plumbing', 'WiFi', 'Furniture', 'Sanitation', 'Other'];
const PRIORITIES  = ['Low', 'Medium', 'High', 'Critical'];

const statusVariant = { 'Open': 'danger', 'In Progress': 'warning', 'Resolved': 'success' };
const priorityColor = {
  Low:      'text-slate-500  bg-slate-50  border-slate-200',
  Medium:   'text-sky-600    bg-sky-50    border-sky-100',
  High:     'text-amber-600  bg-amber-50  border-amber-100',
  Critical: 'text-rose-600   bg-rose-50   border-rose-100',
};
const categoryIcon = { Electrical: '⚡', Plumbing: '🔧', WiFi: '📶', Furniture: '🪑', Sanitation: '🧹', Other: '📋' };

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filters, setFilters]       = useState({ status: '', category: '', priority: '' });
  const [expanded, setExpanded]     = useState(null);
  const [acting, setActing]         = useState(null);
  const [assignInputs, setAssignInputs] = useState({});  // { [complaintId]: string }
  const [commentTexts, setCommentTexts] = useState({});  // { [complaintId]: string }
  const [commenting, setCommenting] = useState(null);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status)   params.status   = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.priority) params.priority = filters.priority;
      const res = await getAllComplaints(params);
      setComplaints(res.data.complaints || []);
    } catch {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); }, [filters]);

  const handleStatus = async (id, status) => {
    setActing(id);
    try {
      const res = await updateComplaintStatus(id, { status });
      setComplaints(prev => prev.map(c => c._id === id ? res.data.complaint : c));
      toast.success(`Marked as ${status}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setActing(null);
    }
  };

  const handleAssign = async (id) => {
    const name = assignInputs[id]?.trim();
    if (!name) return;
    setActing(id + '_assign');
    try {
      const res = await assignComplaint(id, { assignedTo: name });
      setComplaints(prev => prev.map(c => c._id === id ? res.data.complaint : c));
      toast.success('Complaint assigned');
      setAssignInputs(prev => ({ ...prev, [id]: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assign failed');
    } finally {
      setActing(null);
    }
  };

  const handleComment = async (id) => {
    const text = commentTexts[id]?.trim();
    if (!text) return;
    setCommenting(id);
    try {
      const res = await addComplaintComment(id, { text });
      setComplaints(prev => prev.map(c => c._id === id ? res.data.complaint : c));
      setCommentTexts(prev => ({ ...prev, [id]: '' }));
      toast.success('Comment added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setCommenting(null);
    }
  };

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

  // Stats across all loaded complaints (unfiltered view sums)
  const counts = complaints.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {});

  const selectCls = "text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-200";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Hostel Complaints</h1>
            <p className="text-sm text-slate-500">{complaints.length} complaint{complaints.length !== 1 ? 's' : ''} shown</p>
          </div>
        </div>
        <button
          onClick={() => fetchComplaints()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Open',        count: counts['Open']        || 0, cls: 'bg-rose-50   border-rose-100   text-rose-700' },
          { label: 'In Progress', count: counts['In Progress'] || 0, cls: 'bg-amber-50  border-amber-100  text-amber-700' },
          { label: 'Resolved',    count: counts['Resolved']    || 0, cls: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
        ].map(({ label, count, cls }) => (
          <div key={label} className={`${cls} border rounded-xl px-4 py-3 text-center cursor-pointer transition-opacity hover:opacity-80`}
            onClick={() => setFilters(f => ({ ...f, status: f.status === label ? '' : label }))}>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className={selectCls}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))} className={selectCls}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{categoryIcon[c]} {c}</option>)}
        </select>
        <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))} className={selectCls}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {(filters.status || filters.category || filters.priority) && (
          <button onClick={() => setFilters({ status: '', category: '', priority: '' })}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400">
          <AlertTriangle size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No complaints match the current filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map(c => {
            const isOpen = expanded === c._id;
            const isActing = acting === c._id;
            return (
              <div key={c._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => toggleExpand(c._id)}
                  className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xl mt-0.5 flex-shrink-0">{categoryIcon[c.category] || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">{c.title}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${priorityColor[c.priority]}`}>
                        {c.priority}
                      </span>
                      {c.assignedTo && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 flex items-center gap-1">
                          <User size={9} /> {c.assignedTo}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <Badge variant={statusVariant[c.status] || 'default'}>{c.status}</Badge>
                      <span className="text-xs text-slate-500 font-medium">{c.studentId?.name || '—'}</span>
                      <span className="text-xs text-slate-400">{c.studentId?.email || ''}</span>
                      {c.roomId && (
                        <span className="text-xs text-slate-400">
                          Room {c.roomId.roomNumber} · {c.roomId.hostelBlock} · {c.roomId.hostelType}
                        </span>
                      )}
                      {c.comments?.length > 0 && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <MessageSquare size={10} />{c.comments.length}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-slate-400 mt-1 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 mt-1 flex-shrink-0" />}
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-slate-100 space-y-4">
                    <p className="text-sm text-slate-600 mt-4 leading-relaxed">{c.description}</p>

                    {/* Status actions */}
                    {c.status !== 'Resolved' && (
                      <div className="flex flex-wrap gap-2">
                        {c.status === 'Open' && (
                          <button
                            disabled={isActing}
                            onClick={() => handleStatus(c._id, 'In Progress')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                          >
                            {isActing ? <Spinner size="xs" /> : <Loader2 size={12} />}
                            Mark In Progress
                          </button>
                        )}
                        <button
                          disabled={isActing}
                          onClick={() => handleStatus(c._id, 'Resolved')}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        >
                          {isActing ? <Spinner size="xs" /> : <CheckCircle2 size={12} />}
                          Mark Resolved
                        </button>
                      </div>
                    )}

                    {c.status === 'Resolved' && c.resolvedAt && (
                      <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                        <CheckCircle2 size={12} />
                        Resolved on {new Date(c.resolvedAt).toLocaleString()}
                      </div>
                    )}

                    {/* Assign staff */}
                    {c.status !== 'Resolved' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                          {c.assignedTo ? `Currently: ${c.assignedTo} — reassign:` : 'Assign to staff:'}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Staff name or ID"
                            value={assignInputs[c._id] || ''}
                            onChange={e => setAssignInputs(prev => ({ ...prev, [c._id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleAssign(c._id)}
                            className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all"
                          />
                          <button
                            onClick={() => handleAssign(c._id)}
                            disabled={acting === c._id + '_assign' || !assignInputs[c._id]?.trim()}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                          >
                            {acting === c._id + '_assign' ? <Spinner size="xs" /> : 'Assign'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Comments */}
                    {c.comments?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Thread</p>
                        {c.comments.map((comment, i) => (
                          <div key={i} className={`flex gap-2 ${comment.authorRole === 'hostelAdmin' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                              comment.authorRole === 'hostelAdmin' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {comment.authorRole === 'hostelAdmin' ? 'A' : 'S'}
                            </div>
                            <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                              comment.authorRole === 'hostelAdmin'
                                ? 'bg-primary-50 text-primary-900 rounded-tr-none'
                                : 'bg-slate-100 text-slate-800 rounded-tl-none'
                            }`}>
                              <p>{comment.text}</p>
                              <p className="text-[10px] opacity-60 mt-0.5">{new Date(comment.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Admin add comment */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Reply to student..."
                        value={commentTexts[c._id] || ''}
                        onChange={e => setCommentTexts(prev => ({ ...prev, [c._id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && commenting !== c._id && handleComment(c._id)}
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all"
                      />
                      <button
                        onClick={() => handleComment(c._id)}
                        disabled={commenting === c._id || !commentTexts[c._id]?.trim()}
                        className="p-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {commenting === c._id ? <Spinner size="xs" /> : <Send size={14} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
