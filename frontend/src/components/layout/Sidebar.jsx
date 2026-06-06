import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, GraduationCap, CalendarCheck, ClipboardList,
  Settings, LogOut, ChevronRight, BookMarked, ClipboardCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const navConfig = {
  student: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Course Catalog', to: '/courses/catalog', icon: BookOpen },
    { label: 'Enroll / Drop', to: '/enrollment/browse', icon: GraduationCap },
    { label: 'My Timetable', to: '/enrollment/timetable', icon: CalendarCheck },
    { label: 'My Attendance', to: '/attendance/my', icon: ClipboardList },
  ],
  faculty: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Course Catalog', to: '/courses/catalog', icon: BookOpen },
    { label: 'My Offerings', to: '/courses/offerings', icon: BookMarked },
    { label: 'Mark Attendance', to: '/attendance/mark', icon: ClipboardCheck },
  ],
  admin: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Courses', to: '/courses/manage', icon: BookOpen },
    { label: 'Course Offerings', to: '/courses/offerings', icon: BookMarked },
    { label: 'Course Catalog', to: '/courses/catalog', icon: GraduationCap },
  ],
};

export default function Sidebar({ onClose }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const items = navConfig[user?.role] || [];

  const handleLogout = () => {
    signOut();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const roleColors = { admin: 'bg-violet-500', faculty: 'bg-emerald-500', student: 'bg-sky-500' };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64 flex-shrink-0 relative z-10">
      {/* Logo */}
      <div onClick={() => navigate('/dashboard')} className="px-5 py-5 border-b border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors">
        <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary-600/20">
          <GraduationCap size={16} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-sm text-slate-900 tracking-tight">CampusHub</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">ERP Portal</p>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => { navigate('/profile'); onClose?.(); }}>
          <div className={`w-8 h-8 rounded-full ${roleColors[user?.role] || 'bg-slate-300'} flex items-center justify-center flex-shrink-0 text-white`}>
            <span className="text-xs font-semibold">{user?.name?.charAt(0)?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-500 capitalize">{user?.role}</p>
          </div>
          <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-slate-100 space-y-1">
        <NavLink to="/profile" onClick={onClose} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <Settings size={16} className="flex-shrink-0" />
          <span>Settings</span>
        </NavLink>
        <button onClick={handleLogout} className="sidebar-item w-full hover:!bg-rose-50 hover:!text-rose-600">
          <LogOut size={16} className="flex-shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}
