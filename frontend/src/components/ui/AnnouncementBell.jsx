import { useState, useEffect, useRef, useCallback } from 'react';
import { Megaphone, CheckCheck, X, ExternalLink, AlertTriangle, Info, Star } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getAnnouncements, getUnreadCount, markAsRead, markAllRead } from '../../api/announcements';
import { useAuth } from '../../context/AuthContext';

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
    urgent: {
        dot: 'bg-rose-500',
        badge: 'bg-rose-100 text-rose-700',
        icon: AlertTriangle,
        iconColor: 'text-rose-500',
        iconBg: 'bg-rose-100',
    },
    important: {
        dot: 'bg-amber-400',
        badge: 'bg-amber-100 text-amber-700',
        icon: Star,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-100',
    },
    normal: {
        dot: 'bg-sky-400',
        badge: 'bg-slate-100 text-slate-600',
        icon: Info,
        iconColor: 'text-sky-500',
        iconBg: 'bg-sky-100',
    },
};

const CATEGORY_COLORS = {
    University: 'bg-violet-100 text-violet-700',
    Holiday: 'bg-emerald-100 text-emerald-700',
    Placement: 'bg-blue-100 text-blue-700',
    FeeReminder: 'bg-orange-100 text-orange-700',
    HostelNotice: 'bg-teal-100 text-teal-700',
    TransportNotice: 'bg-cyan-100 text-cyan-700',
    EmergencyAlert: 'bg-rose-100 text-rose-700',
    Assignment: 'bg-indigo-100 text-indigo-700',
    Quiz: 'bg-purple-100 text-purple-700',
    ExamSchedule: 'bg-amber-100 text-amber-700',
    ClassCancellation: 'bg-red-100 text-red-700',
    LabInstruction: 'bg-lime-100 text-lime-700',
    ProjectUpdate: 'bg-sky-100 text-sky-700',
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

// ─── COMPONENT ─────────────────────────────────────────────────────────────────

export default function AnnouncementBell() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [announcements, setAnnouncements] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef(null);
    const intervalRef = useRef(null);

    const fetchUnread = useCallback(async () => {
        try {
            const res = await getUnreadCount();
            setUnreadCount(res.data.unreadCount || 0);
        } catch { }
    }, []);

    const fetchAnnouncements = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAnnouncements({ limit: 10 });
            setAnnouncements(res.data.announcements || []);
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (!user) return;
        fetchUnread();
        intervalRef.current = setInterval(fetchUnread, 60_000);
        return () => clearInterval(intervalRef.current);
    }, [fetchUnread, user]);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleOpen = () => {
        const next = !open;
        setOpen(next);
        if (next) fetchAnnouncements();
    };

    const handleMarkOne = async (id, e) => {
        e.stopPropagation();
        try {
            await markAsRead(id);
            setAnnouncements(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { }
    };

    const handleMarkAll = async () => {
        try {
            await markAllRead();
            setAnnouncements(prev => prev.map(a => ({ ...a, isRead: true })));
            setUnreadCount(0);
        } catch { }
    };

    const handleViewAll = () => {
        setOpen(false);
        navigate('/announcements');
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={handleOpen}
                className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
                title="Announcements"
            >
                <Megaphone size={18} className="text-slate-600" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="absolute right-0 top-full mt-2 w-96 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden z-50 origin-top-right"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                            <div className="flex items-center gap-2">
                                <Megaphone size={15} className="text-violet-500" />
                                <span className="text-sm font-bold text-slate-800">Announcements</span>
                                {unreadCount > 0 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAll}
                                        className="flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-700 font-semibold px-2 py-1 rounded-lg hover:bg-sky-50 transition-colors"
                                    >
                                        <CheckCheck size={12} /> All read
                                    </button>
                                )}
                                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 text-slate-400">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[420px] overflow-y-auto">
                            {loading ? (
                                <div className="flex justify-center py-10">
                                    <div className="w-5 h-5 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
                                </div>
                            ) : announcements.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <Megaphone size={28} className="mb-2 opacity-30" />
                                    <p className="text-sm font-medium">No announcements</p>
                                    <p className="text-xs opacity-60 mt-0.5">Check back later</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {announcements.map((a) => {
                                        const priorityCfg = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.normal;
                                        const Icon = priorityCfg.icon;
                                        const catColor = CATEGORY_COLORS[a.category] || 'bg-slate-100 text-slate-600';

                                        return (
                                            <div
                                                key={a._id}
                                                onClick={(e) => !a.isRead && handleMarkOne(a._id, e)}
                                                className={`flex gap-3 px-4 py-3.5 cursor-pointer transition-colors ${a.isRead ? 'bg-white hover:bg-slate-50' : 'bg-violet-50/30 hover:bg-violet-50/60'}`}
                                            >
                                                {/* Icon */}
                                                <div className={`w-9 h-9 rounded-xl ${priorityCfg.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                                    <Icon size={16} className={priorityCfg.iconColor} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className={`text-sm leading-snug ${a.isRead ? 'text-slate-700 font-medium' : 'text-slate-900 font-semibold'}`}>
                                                            {a.title}
                                                        </p>
                                                        {!a.isRead && (
                                                            <span className={`w-2 h-2 rounded-full ${priorityCfg.dot} flex-shrink-0 mt-1.5`} />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{a.body}</p>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${catColor}`}>{a.category}</span>
                                                        <span className="text-[10px] text-slate-400">{timeAgo(a.createdAt)}</span>
                                                        <span className="text-[10px] text-slate-400">· {a.createdBy?.name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                            <button
                                onClick={handleViewAll}
                                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors py-1"
                            >
                                <ExternalLink size={13} />
                                View all announcements
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
