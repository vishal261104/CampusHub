import { useState, useEffect } from 'react';
import { getMyComplaints, createComplaint, addComplaintComment, updateComplaintStatus } from '../../api/hostel';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { AlertTriangle, Plus, X, MessageSquare, ChevronDown, ChevronUp, Send, Clock, CheckCircle2, Loader2 } from 'lucide-react';

const CATEGORIES = ['Electrical', 'Plumbing', 'WiFi', 'Furniture', 'Sanitation', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const INITIAL_FORM = { title: '', description: '', category: 'Other', priority: 'Medium' };

const statusConfig = {
  'Open':        { variant: 'danger',  icon: AlertTriangle, label: 'Open' },
  'In Progress': { variant: 'warning', icon: Loader2,       label: 'In Progress' },
  'Resolved':    { variant: 'success', icon: CheckCircle2,  label: 'Resolved' },
};

const priorityColor = {
  Low:      'text-slate-500  bg-slate-50  border-slate-200',
  Medium:   'text-sky-600    bg-sky-50    border-sky-100',
  High:     'text-amber-600  bg-amber-50  border-amber-100',
  Critical: 'text-rose-600   bg-rose-50   border-rose-100',
};

const categoryIcon = { Electrical: '⚡', Plumbing: '🔧', WiFi: '📶', Furniture: '🪑', Sanitation: '🧹', Other: '📋' };

export default function StudentComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(INITIAL_FORM);
  const [saving, setSaving]         = useState(false);
  const [expanded, setExpanded]     = useState(null);  // complaint _id
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting]   = useState(false);
  const [resolving, setResolving]     = useState(null); // complaint _id being resolved

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await getMyComplaints();
      setComplaints(res.data.complaints || []);
    } catch (err) {
      if (err.response?.status !== 403) toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return toast.error('Title and description are required');
    setSaving(true);
    try {
      await createComplaint(form);
      toast.success('Complaint submitted successfully');
      setShowForm(false);
      setForm(INITIAL_FORM);
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setSaving(false);
    }
  };

  const handleComment = async (complaintId) => {
    if (!commentText.trim()) return;
    setCommenting(true);
    try {
      const res = await addComplaintComment(complaintId, { text: commentText });
      setComplaints(prev => prev.map(c => c._id === complaintId ? res.data.complaint : c));
      setCommentText('');
      toast.success('Comment added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setCommenting(false);
    }
  };

  const handleResolve = async (complaintId) => {
    setResolving(complaintId);
    try {
      const res = await updateComplaintStatus(complaintId, { status: 'Resolved' });
      setComplaints(prev => prev.map(c => c._id === complaintId ? res.data.complaint : c));
      toast.success('Complaint marked as Resolved — thank you!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve complaint');
    } finally {
      setResolving(null);
    }
  };

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

  const openCount = complaints.filter(c => c.status === 'Open').length;
  const inProgCount = complaints.filter(c => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Complaints</h1>
            <p className="text-sm text-slate-500">{complaints.length} total · {openCount} open</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-500 rounded-xl hover:bg-rose-600 transition-colors shadow-sm"
        >
          <Plus size={14} /> New Complaint
        </button>
      </div>

      {/* Stats row */}
      {complaints.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Open',        count: openCount,     bg: 'bg-rose-50  border-rose-100  text-rose-700' },
            { label: 'In Progress', count: inProgCount,   bg: 'bg-amber-50 border-amber-100 text-amber-700' },
            { label: 'Resolved',    count: resolvedCount, bg: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
          ].map(({ label, count, bg }) => (
            <div key={label} className={`${bg} border rounded-xl px-4 py-3 text-center`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Complaints list */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400">
          <AlertTriangle size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No complaints raised yet</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-rose-500 hover:underline">
            Raise your first complaint
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map(c => {
            const sc = statusConfig[c.status] || statusConfig['Open'];
            const isOpen = expanded === c._id;
            return (
              <div key={c._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Card header */}
                <button
                  onClick={() => toggleExpand(c._id)}
                  className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xl mt-0.5 flex-shrink-0">{categoryIcon[c.category] || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 truncate">{c.title}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${priorityColor[c.priority]}`}>
                        {c.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <Badge variant={sc.variant}>{c.status}</Badge>
                      <span className="text-xs text-slate-400">{c.category}</span>
                      <span className="text-xs text-slate-400">
                        {c.roomId?.roomNumber ? `Room ${c.roomId.roomNumber} · ${c.roomId.hostelBlock}` : ''}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={10} />{new Date(c.createdAt).toLocaleDateString()}
                      </span>
                      {c.comments?.length > 0 && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <MessageSquare size={10} />{c.comments.length}
                        </span>
                      )}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-slate-400 mt-1 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 mt-1 flex-shrink-0" />}
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-slate-100">
                    <p className="text-sm text-slate-600 mt-4 leading-relaxed">{c.description}</p>

                    {c.assignedTo && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                        <span className="font-semibold">Assigned to:</span> {c.assignedTo}
                      </div>
                    )}

                    {/* Student can mark In Progress complaints as Resolved */}
                    {c.status === 'In Progress' && (
                      <div className="mt-3">
                        <button
                          onClick={() => handleResolve(c._id)}
                          disabled={resolving === c._id}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        >
                          {resolving === c._id ? <Spinner size="xs" /> : <CheckCircle2 size={14} />}
                          Issue Resolved — Mark as Done
                        </button>
                        <p className="text-[11px] text-slate-400 mt-1.5">Only mark resolved if the issue has been fixed to your satisfaction.</p>
                      </div>
                    )}

                    {c.status === 'Resolved' && c.resolvedAt && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                        <CheckCircle2 size={12} />
                        Resolved on {new Date(c.resolvedAt).toLocaleDateString()}
                      </div>
                    )}

                    {/* Comments thread */}
                    {c.comments?.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Comments</p>
                        {c.comments.map((comment, i) => (
                          <div key={i} className={`flex gap-2 ${comment.authorRole === 'hostelAdmin' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                              comment.authorRole === 'hostelAdmin' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {comment.authorRole === 'hostelAdmin' ? 'A' : 'S'}
                            </div>
                            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
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

                    {/* Add comment — only if not resolved */}
                    {c.status !== 'Resolved' && (
                      <div className="mt-4 flex gap-2">
                        <input
                          type="text"
                          placeholder="Add a comment..."
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !commenting && handleComment(c._id)}
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all"
                        />
                        <button
                          onClick={() => handleComment(c._id)}
                          disabled={commenting || !commentText.trim()}
                          className="p-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                          {commenting ? <Spinner size="xs" /> : <Send size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Complaint Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">New Complaint</h2>
                <p className="text-xs text-slate-400 mt-0.5">Your room will be auto-detected from your allocation</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Title</label>
                <input
                  type="text" required maxLength={100}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Fan not working in room"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{categoryIcon[c]} {c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
                <textarea
                  required maxLength={1000} rows={4}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the issue in detail..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all resize-none"
                />
                <p className="text-[10px] text-slate-400 mt-1 text-right">{form.description.length}/1000</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-semibold text-white bg-rose-500 rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Spinner size="xs" />}
                  Submit Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
