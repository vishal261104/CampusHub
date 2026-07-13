import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Megaphone, Search, Plus, X, AlertTriangle, Star, Info,
    CheckCheck, Trash2, Edit2, Globe, Users, BookOpen, Building2,
    ChevronDown, Filter, Send
} from 'lucide-react';
import {
    getAnnouncements, createAnnouncement, updateAnnouncement,
    deleteAnnouncement, markAsRead, markAllRead
} from '../../api/announcements';
import { listOfferings } from '../../api/offerings';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const ADMIN_CATEGORIES = [
    'University', 'Holiday', 'Placement', 'FeeReminder',
    'HostelNotice', 'TransportNotice', 'EmergencyAlert',
];
const FACULTY_CATEGORIES = [
    'Assignment', 'Quiz', 'ExamSchedule', 'ClassCancellation',
    'LabInstruction', 'ProjectUpdate',
];

const PRIORITY_CONFIG = {
    urgent:    { label: 'Urgent',    dot: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700', border: 'border-l-rose-500',    ring: 'ring-rose-200' },
    important: { label: 'Important', dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700', border: 'border-l-amber-400', ring: 'ring-amber-200' },
    normal:    { label: 'Normal',    dot: 'bg-sky-400',   badge: 'bg-slate-100 text-slate-600', border: 'border-l-slate-200',  ring: 'ring-slate-100' },
};

const CATEGORY_COLORS = {
    University:      'bg-violet-100 text-violet-700',
    Holiday:         'bg-emerald-100 text-emerald-700',
    Placement:       'bg-blue-100 text-blue-700',
    FeeReminder:     'bg-orange-100 text-orange-700',
    HostelNotice:    'bg-teal-100 text-teal-700',
    TransportNotice: 'bg-cyan-100 text-cyan-700',
    EmergencyAlert:  'bg-rose-100 text-rose-700',
    Assignment:      'bg-indigo-100 text-indigo-700',
    Quiz:            'bg-purple-100 text-purple-700',
    ExamSchedule:    'bg-amber-100 text-amber-700',
    ClassCancellation: 'bg-red-100 text-red-700',
    LabInstruction:  'bg-lime-100 text-lime-700',
    ProjectUpdate:   'bg-sky-100 text-sky-700',
};

const AUDIENCE_CONFIG = {
    all:        { label: 'Everyone',      icon: Globe,     color: 'text-violet-500' },
    students:   { label: 'All Students',  icon: Users,     color: 'text-sky-500' },
    faculty:    { label: 'All Faculty',   icon: Users,     color: 'text-emerald-500' },
    course:     { label: 'Course',        icon: BookOpen,  color: 'text-indigo-500' },
    department: { label: 'Department',    icon: Building2, color: 'text-amber-500' },
};

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// ─── COMPOSE MODAL ──────────────────────────────────────────────────────────────

function ComposeModal({ role, onClose, onSuccess }) {
    const [form, setForm] = useState({
        title: '', body: '', category: '',
        audience: role === 'faculty' ? 'course' : 'all',
        courseOfferingId: '', department: '',
        priority: 'normal', expiresAt: '',
    });
    const [offerings, setOfferings] = useState([]);
    const [loading, setLoading] = useState(false);

    const categories = role === 'admin' ? ADMIN_CATEGORIES : FACULTY_CATEGORIES;
    const audienceOptions = role === 'admin'
        ? ['all', 'students', 'faculty', 'department']
        : ['course', 'students', 'all'];

    useEffect(() => {
        if (role === 'faculty' || (role === 'admin' && form.audience === 'course')) {
            listOfferings({ myOfferings: role === 'faculty' })
                .then(res => setOfferings(res.data.offerings || res.data || []))
                .catch(() => {});
        }
    }, [role, form.audience]);

    const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createAnnouncement(form);
            toast.success('Announcement published!');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to publish');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center">
                            <Megaphone size={16} className="text-violet-600" />
                        </div>
                        <h2 className="font-bold text-slate-900">New Announcement</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Title *</label>
                        <input type="text" value={form.title} onChange={f('title')} required
                            className={inputClass} placeholder="e.g. Semester Registration Starts" />
                    </div>

                    {/* Body */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Message *</label>
                        <textarea value={form.body} onChange={f('body')} required rows={4}
                            className={`${inputClass} resize-none`} placeholder="Write the full announcement here..." />
                    </div>

                    {/* Category + Priority row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Category *</label>
                            <select value={form.category} onChange={f('category')} required className={inputClass}>
                                <option value="">Select category</option>
                                {categories.map(c => <option key={c} value={c}>{c.replace(/([A-Z])/g, ' $1').trim()}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Priority</label>
                            <select value={form.priority} onChange={f('priority')} className={inputClass}>
                                <option value="normal">Normal</option>
                                <option value="important">Important</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                    </div>

                    {/* Audience */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Audience *</label>
                        <select value={form.audience} onChange={f('audience')} className={inputClass}>
                            {audienceOptions.map(a => (
                                <option key={a} value={a}>{AUDIENCE_CONFIG[a]?.label || a}</option>
                            ))}
                        </select>
                    </div>

                    {/* Course offering selector */}
                    {form.audience === 'course' && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Course Offering *</label>
                            <select value={form.courseOfferingId} onChange={f('courseOfferingId')} required className={inputClass}>
                                <option value="">Select a course offering</option>
                                {offerings.map(o => (
                                    <option key={o._id} value={o._id}>
                                        {o.courseId?.courseTitle || o.courseId?.courseCode} — {o.semester} {o.year} §{o.section}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Department selector */}
                    {form.audience === 'department' && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Department *</label>
                            <input type="text" value={form.department} onChange={f('department')} required
                                className={inputClass} placeholder="e.g. Computer Science" />
                        </div>
                    )}

                    {/* Expiry date */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Expires On (optional)</label>
                        <input type="date" value={form.expiresAt} onChange={f('expiresAt')} className={inputClass} />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Cancel</Button>
                        <Button type="submit" loading={loading} className="flex-1">
                            <Send size={14} /> Publish
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── ANNOUNCEMENT CARD ─────────────────────────────────────────────────────────

function AnnouncementCard({ announcement: a, onRead, onDelete, canManage, userId }) {
    const priorityCfg = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.normal;
    const catColor = CATEGORY_COLORS[a.category] || 'bg-slate-100 text-slate-600';
    const audienceCfg = AUDIENCE_CONFIG[a.audience] || AUDIENCE_CONFIG.all;
    const AudienceIcon = audienceCfg.icon;
    const isOwner = String(a.createdBy?._id) === String(userId);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!window.confirm('Delete this announcement?')) return;
        setDeleting(true);
        try {
            await deleteAnnouncement(a._id);
            toast.success('Deleted');
            onDelete(a._id);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div
            className={`bg-white rounded-2xl border border-slate-100 border-l-4 ${priorityCfg.border} transition-all duration-200 hover:shadow-md ${!a.isRead ? 'shadow-sm' : ''}`}
            onClick={() => !a.isRead && onRead(a._id)}
        >
            <div className="p-5">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                            {/* Priority badge */}
                            {a.priority !== 'normal' && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${priorityCfg.badge}`}>
                                    {a.priority === 'urgent' && <AlertTriangle size={9} className="inline mr-1" />}
                                    {a.priority === 'important' && <Star size={9} className="inline mr-1" />}
                                    {priorityCfg.label}
                                </span>
                            )}
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catColor}`}>
                                {a.category.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            {/* Audience */}
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                <AudienceIcon size={10} className={audienceCfg.color} />
                                {audienceCfg.label}
                                {a.courseOfferingId && <span className="text-slate-300">· {a.courseOfferingId?.section && `§${a.courseOfferingId.section}`}</span>}
                            </span>
                        </div>

                        <h3 className={`font-bold text-base leading-snug ${a.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                            {!a.isRead && (
                                <span className={`inline-block w-2 h-2 rounded-full ${priorityCfg.dot} mr-2 mb-0.5 flex-shrink-0`} />
                            )}
                            {a.title}
                        </h3>

                        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{a.body}</p>

                        {/* Footer meta */}
                        <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                            <span className="font-medium">{a.createdBy?.name}</span>
                            <span>·</span>
                            <span className="capitalize text-slate-300">{a.createdBy?.role}</span>
                            <span>·</span>
                            <span>{timeAgo(a.createdAt)}</span>
                        </div>
                    </div>

                    {/* Action buttons for creator/admin */}
                    {(canManage && isOwner) && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                            disabled={deleting}
                            className="p-2 rounded-xl hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors flex-shrink-0"
                        >
                            {deleting ? <Spinner size="sm" /> : <Trash2 size={14} />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── FILTER BAR ────────────────────────────────────────────────────────────────

const ALL_CATEGORIES = [...ADMIN_CATEGORIES, ...FACULTY_CATEGORIES];
const PRIORITY_OPTIONS = ['urgent', 'important', 'normal'];

function FilterBar({ filters, onChange }) {
    return (
        <div className="flex flex-wrap gap-2">
            {/* Priority chips */}
            <button
                onClick={() => onChange({ ...filters, priority: '' })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${!filters.priority ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
            >
                All
            </button>
            <button
                onClick={() => onChange({ ...filters, priority: 'urgent' })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filters.priority === 'urgent' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-500 border-slate-200 hover:border-rose-300'}`}
            >
                🚨 Urgent
            </button>
            <button
                onClick={() => onChange({ ...filters, priority: 'important' })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filters.priority === 'important' ? 'bg-amber-400 text-white border-amber-400' : 'bg-white text-slate-500 border-slate-200 hover:border-amber-300'}`}
            >
                ⭐ Important
            </button>

            {/* Category chips */}
            <select
                value={filters.category || ''}
                onChange={e => onChange({ ...filters, category: e.target.value })}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer"
            >
                <option value="">All Categories</option>
                {ALL_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.replace(/([A-Z])/g, ' $1').trim()}</option>
                ))}
            </select>
        </div>
    );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', category: '', priority: '', page: 1 });
    const [showCompose, setShowCompose] = useState(false);
    const searchRef = useRef(null);

    const canManage = user?.role === 'admin' || user?.role === 'faculty';

    const fetchAnnouncements = useCallback(async () => {
        setLoading(true);
        try {
            const params = { ...filters };
            if (!params.search) delete params.search;
            if (!params.category) delete params.category;
            if (!params.priority) delete params.priority;

            const res = await getAnnouncements({ ...params, limit: 20 });
            setAnnouncements(res.data.announcements || []);
            setTotal(res.data.total || 0);
        } catch {
            toast.error('Failed to load announcements');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => { fetchAnnouncements(); }, filters.search ? 400 : 0);
        return () => clearTimeout(timer);
    }, [filters, fetchAnnouncements]);

    const handleRead = async (id) => {
        try {
            await markAsRead(id);
            setAnnouncements(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
        } catch { }
    };

    const handleMarkAll = async () => {
        try {
            await markAllRead();
            setAnnouncements(prev => prev.map(a => ({ ...a, isRead: true })));
            toast.success('All marked as read');
        } catch { }
    };

    const handleDelete = (id) => {
        setAnnouncements(prev => prev.filter(a => a._id !== id));
        setTotal(t => t - 1);
    };

    const unreadCount = announcements.filter(a => !a.isRead).length;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-violet-100 rounded-2xl flex items-center justify-center">
                            <Megaphone size={20} className="text-violet-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold text-slate-900">Announcements</h1>
                            <p className="text-slate-500 text-sm mt-0.5">
                                {total > 0 ? `${total} announcement${total !== 1 ? 's' : ''}` : 'No announcements yet'}
                                {unreadCount > 0 && <span className="ml-2 text-violet-600 font-semibold">· {unreadCount} unread</span>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={handleMarkAll}>
                            <CheckCheck size={14} /> Mark all read
                        </Button>
                    )}
                    {canManage && (
                        <Button onClick={() => setShowCompose(true)}>
                            <Plus size={14} /> Compose
                        </Button>
                    )}
                </div>
            </div>

            {/* Search + Filters */}
            <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        ref={searchRef}
                        type="text"
                        value={filters.search}
                        onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
                        placeholder="Search announcements..."
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                    />
                    {filters.search && (
                        <button onClick={() => setFilters(f => ({ ...f, search: '', page: 1 }))} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Filter chips */}
                <FilterBar filters={filters} onChange={f => setFilters({ ...f, page: 1 })} />
            </div>

            {/* Announcements Feed */}
            {loading ? (
                <div className="py-16 flex justify-center"><Spinner size="lg" /></div>
            ) : announcements.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                    <Megaphone size={40} className="mx-auto mb-4 opacity-20" />
                    <p className="font-semibold text-lg">No announcements found</p>
                    <p className="text-sm mt-1">
                        {filters.search || filters.category || filters.priority
                            ? 'Try adjusting your filters'
                            : canManage ? 'Click Compose to create the first announcement' : 'Check back later'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {announcements.map(a => (
                        <AnnouncementCard
                            key={a._id}
                            announcement={a}
                            onRead={handleRead}
                            onDelete={handleDelete}
                            canManage={canManage}
                            userId={user?._id || user?.id}
                        />
                    ))}

                    {/* Load more */}
                    {announcements.length < total && (
                        <button
                            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                            className="w-full py-3 text-sm font-semibold text-violet-600 hover:text-violet-700 border border-slate-200 rounded-2xl hover:bg-violet-50 transition-colors"
                        >
                            Load more
                        </button>
                    )}
                </div>
            )}

            {/* Compose Modal */}
            {showCompose && (
                <ComposeModal
                    role={user?.role}
                    onClose={() => setShowCompose(false)}
                    onSuccess={fetchAnnouncements}
                />
            )}
        </div>
    );
}
