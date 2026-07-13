import { useState, useRef, useEffect } from 'react';
import { Menu, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import NotificationBell from '../ui/NotificationBell';
import AnnouncementBell from '../ui/AnnouncementBell';

export default function Topbar({ onMenuClick, title }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const roleStyles = { 
    admin: 'bg-gradient-to-br from-slate-800 to-slate-900 ring-slate-800/30', 
    faculty: 'bg-gradient-to-br from-zinc-600 to-zinc-800 ring-zinc-500/30', 
    student: 'bg-gradient-to-br from-stone-400 to-stone-600 ring-stone-400/30' 
  };
  const roleBadgeColors = { admin: 'text-slate-700 bg-slate-100', faculty: 'text-zinc-700 bg-zinc-100', student: 'text-stone-700 bg-stone-100' };

  
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    signOut();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Menu size={18} className="text-slate-600" />
        </button>
        {title && <h1 className="text-sm font-semibold text-slate-800">{title}</h1>}
      </div>

      <div className="flex items-center gap-2 relative" ref={dropdownRef}>
        <NotificationBell />
        <AnnouncementBell />
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none"
        >
          <div className={`w-8 h-8 rounded-full ${roleStyles[user?.role] || 'bg-gradient-to-br from-slate-400 to-slate-500 ring-slate-400/30'} flex items-center justify-center ring-2 ring-offset-2 hover:opacity-90 transition-opacity`}>
            <span className="text-white text-xs font-semibold tracking-wide select-none">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/60 overflow-hidden z-50 origin-top-right"
            >
              {}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                <span className={`mt-1.5 inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${roleBadgeColors[user?.role] || 'text-slate-500 bg-slate-50'}`}>
                  {user?.role}
                </span>
              </div>

              {}
              <div className="py-1">
                <button
                  onClick={() => { setOpen(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings size={15} className="text-slate-400" />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut size={15} className="text-rose-400" />
                  Log out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
