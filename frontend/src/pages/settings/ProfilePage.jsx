import { useState, useEffect } from 'react';
import { User, Mail, Key, Shield, Save, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateMe, updatePassword, setUserRoleByEmail } from '../../api/users';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const ROLE_COLORS = { admin: 'danger', faculty: 'success', student: 'primary' };
const ROLE_LABELS = { admin: 'Administrator', faculty: 'Faculty Member', student: 'Student' };

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [roleForm, setRoleForm] = useState({ email: '', role: 'student' });
  const [showPw, setShowPw] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [pwErrors, setPwErrors] = useState({});

  useEffect(() => {
    setProfileForm({ name: user?.name || '', email: user?.email || '' });
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await updateMe(profileForm);
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally { setSavingProfile(false); }
  };

  const validatePw = () => {
    const e = {};
    if (!pwForm.currentPassword) e.currentPassword = 'Required';
    if (pwForm.newPassword.length < 6) e.newPassword = 'At least 6 characters';
    if (pwForm.newPassword !== pwForm.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setPwErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePw()) return;
    setSavingPw(true);
    try {
      await updatePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setSavingPw(false); }
  };

  const handleSetRole = async () => {
    setSavingRole(true);
    try {
      await setUserRoleByEmail(roleForm.email, roleForm.role);
      toast.success('User role updated!');
      setRoleForm({ email: '', role: 'student' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set role');
    } finally { setSavingRole(false); }
  };

  const roleColor = user?.role === 'admin' ? '#7c3aed' : user?.role === 'faculty' ? '#10b981' : '#6366f1';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Header */}
      <div className="card p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0" style={{ backgroundColor: roleColor }}>
          {user?.name?.charAt(0)?.toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
          <p className="text-slate-400 text-sm">{user?.email}</p>
          <div className="mt-1.5">
            <Badge variant={ROLE_COLORS[user?.role] || 'default'}>{ROLE_LABELS[user?.role] || user?.role}</Badge>
          </div>
        </div>
      </div>

      {/* Update Profile */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={16} className="text-primary-600" />
          <h3 className="text-sm font-semibold text-slate-800">Personal Information</h3>
        </div>
        <Input label="Full Name" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="John Smith" />
        <Input label="Email Address" type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="you@university.edu" />
        <div className="flex justify-end pt-1">
          <Button loading={savingProfile} onClick={handleSaveProfile}><Save size={15} /> Save Changes</Button>
        </div>
      </div>

      {/* Change Password */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Key size={16} className="text-primary-600" />
          <h3 className="text-sm font-semibold text-slate-800">Change Password</h3>
        </div>
        <Input
          label="Current Password"
          type={showPw ? 'text' : 'password'}
          value={pwForm.currentPassword}
          onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
          error={pwErrors.currentPassword}
          placeholder="••••••••"
        />
        <div className="relative">
          <Input
            label="New Password"
            type={showPw ? 'text' : 'password'}
            value={pwForm.newPassword}
            onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
            error={pwErrors.newPassword}
            placeholder="••••••••"
          />
          <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-8 text-slate-400 hover:text-slate-600">
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <Input
          label="Confirm New Password"
          type={showPw ? 'text' : 'password'}
          value={pwForm.confirmPassword}
          onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
          error={pwErrors.confirmPassword}
          placeholder="••••••••"
        />
        <div className="flex justify-end pt-1">
          <Button loading={savingPw} onClick={handleChangePassword}><Key size={15} /> Change Password</Button>
        </div>
      </div>

      {/* Admin: Set User Role */}
      {user?.role === 'admin' && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-violet-600" />
            <h3 className="text-sm font-semibold text-slate-800">Manage User Roles</h3>
          </div>
          <Input
            label="User Email"
            type="email"
            value={roleForm.email}
            onChange={(e) => setRoleForm({ ...roleForm, email: e.target.value })}
            placeholder="user@university.edu"
          />
          <div>
            <label className="form-label">Assign Role</label>
            <select
              value={roleForm.role}
              onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })}
              className="form-input"
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end pt-1">
            <Button loading={savingRole} onClick={handleSetRole}><Shield size={15} /> Update Role</Button>
          </div>
        </div>
      )}
    </div>
  );
}
