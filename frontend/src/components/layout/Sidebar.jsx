import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, GraduationCap, CalendarCheck, ClipboardList,
  Settings, LogOut, ChevronRight, BookMarked, ClipboardCheck, Home, Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ProfileCard from '../ui/ProfileCard';
import toast from 'react-hot-toast';

const navConfig = {
  student: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Course Catalog', to: '/courses/catalog', icon: BookOpen },
    { label: 'Enroll / Drop', to: '/enrollment/browse', icon: GraduationCap },
    { label: 'My Timetable', to: '/enrollment/timetable', icon: CalendarCheck },
    { label: 'My Attendance', to: '/attendance/my', icon: ClipboardList },
    { label: 'Hostel', to: '/hostel', icon: Home },
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
    { label: 'Manage Users', to: '/users/manage', icon: Users },
    { label: 'Course Offerings', to: '/courses/offerings', icon: BookMarked },
    { label: 'Course Catalog', to: '/courses/catalog', icon: GraduationCap },
    { label: 'Enrollment Requests', to: '/enrollment/admin', icon: ClipboardList },
    { label: 'Hostel Applications', to: '/hostel/admin', icon: Home },
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
      <div onClick={() => navigate('/dashboard')} className="px-5 py-5 border-b border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors group">
        <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow group-hover:shadow-md">
          <span className="font-serif text-xl font-extrabold text-slate-900 leading-none tracking-tighter">C</span>
        </div>
        <div>
          <p className="font-bold text-sm text-slate-900 tracking-tight">CampusHub</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">ERP Portal</p>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-slate-100 flex justify-center">
        <div onClick={() => { navigate('/profile'); onClose?.(); }} className="cursor-pointer w-full">
          <ProfileCard
            imageSrc={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'default'}&hair=${user?.gender === 'Female' ? 'longHairBigHair,longHairBob,longHairBun,longHairCurly,longHairCurvy,longHairDreads,longHairFrida,longHairFro,longHairFroBand,longHairMiaWallace,longHairStraight,longHairStraight2,longHairStraightStrand' : 'shortHairDreads01,shortHairDreads02,shortHairFrizzle,shortHairShaggyMullet,shortHairShortCurly,shortHairShortFlat,shortHairShortRound,shortHairShortWaved,shortHairSides,shortHairTheCaesar,shortHairTheCaesarSidePart'}&facialHairProbability=${user?.gender === 'Female' ? 0 : 10}`}
            name={user?.name || 'User'}
            role={user?.role || 'Guest'}
            className="w-full"
          />
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
