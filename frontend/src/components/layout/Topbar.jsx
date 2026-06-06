import { useState, useRef, useEffect } from 'react';
import { Menu, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Topbar({ onMenuClick, title }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const roleColors = { admin: 'bg-violet-500', faculty: 'bg-emerald-500', student: 'bg-sky-500' };
  const roleBadgeColors = { admin: 'text-violet-600 bg-violet-50', faculty: 'text-emerald-600 bg-emerald-50', student: 'text-sky-600 bg-sky-50' };

  // Close dropdown when clicking outside
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
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className={`w-8 h-8 rounded-full ${roleColors[user?.role] || 'bg-slate-400'} flex items-center justify-center`}>
            <span className="text-white text-xs font-semibold">{user?.name?.charAt(0)?.toUpperCase()}</span>
          </div>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/60 overflow-hidden z-50">
            {/* User info */}
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              <span className={`mt-1.5 inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${roleBadgeColors[user?.role] || 'text-slate-500 bg-slate-50'}`}>
                {user?.role}
              </span>
            </div>

            {/* Actions */}
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
          </div>
        )}
      </div>
    </header>
  );
}
