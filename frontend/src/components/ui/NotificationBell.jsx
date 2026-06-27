import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, IndianRupee, Calendar, AlertTriangle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { getMyNotifications, markAllRead, markOneRead } from '../../api/notifications';
import { useAuth } from '../../context/AuthContext';

const TYPE_CONFIG = {
  payment_success: {
    icon: IndianRupee,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  fee_due_7d: {
    icon: Calendar,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    dot: 'bg-sky-500',
  },
  fee_due_1d: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  fee_overdue: {
    icon: AlertTriangle,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    dot: 'bg-rose-500',
  },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const intervalRef = useRef(null);

  // Only show for students
  if (user?.role !== 'student') return null;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getMyNotifications();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // silently fail — don't break the UI
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds for new notifications
    intervalRef.current = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(intervalRef.current);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleMarkOne = async (id) => {
    try {
      await markOneRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const handleOpen = () => {
    setOpen(prev => !prev);
    if (!open) {
      setLoading(true);
      fetchNotifications().finally(() => setLoading(false));
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
        title="Notifications"
      >
        <Bell size={18} className="text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none shadow-sm">
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
            className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden z-50 origin-top-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-slate-500" />
                <span className="text-sm font-bold text-slate-800">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-700 font-semibold px-2 py-1 rounded-lg hover:bg-sky-50 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck size={12} />
                    All read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="flex justify-center py-10">
                  <div className="w-5 h-5 border-2 border-slate-200 border-t-sky-500 rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Bell size={28} className="mb-2 opacity-30" />
                  <p className="text-sm font-medium">All caught up!</p>
                  <p className="text-xs opacity-60 mt-0.5">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map((n) => {
                    const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG['fee_due_7d'];
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={n._id}
                        onClick={() => !n.isRead && handleMarkOne(n._id)}
                        className={`flex gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                          n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-sky-50/40 hover:bg-sky-50'
                        }`}
                      >
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl ${cfg.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon size={16} className={cfg.iconColor} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug ${n.isRead ? 'text-slate-700 font-medium' : 'text-slate-900 font-semibold'}`}>
                              {n.title}
                            </p>
                            {!n.isRead && (
                              <span className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0 mt-1.5`} />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-medium">{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-center">
                <p className="text-[11px] text-slate-400">Showing latest {notifications.length} notifications</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
