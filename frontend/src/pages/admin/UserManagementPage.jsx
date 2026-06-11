import React, { useState, useEffect } from 'react';
import { Users, Shield, BookOpen, GraduationCap, Building2, Calendar, Search, Home } from 'lucide-react';
import { getAllUsers, setUserRoleById } from '../../api/users';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

const ALL_ROLES = ['student', 'faculty', 'admin', 'hostelAdmin'];

const ROLE_COLORS = {
  admin:       'primary',
  hostelAdmin: 'warning',
  faculty:     'success',
  student:     'secondary',
};

const ROLE_LABELS = {
  admin:       'Admin',
  hostelAdmin: 'Hostel Admin',
  faculty:     'Faculty',
  student:     'Student',
};

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // <-- filter state

  // Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [formRole, setFormRole] = useState('student');
  const [joinYear, setJoinYear] = useState(new Date().getFullYear().toString());
  const [department, setDepartment] = useState('CSE');
  const [studentId, setStudentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await getAllUsers();
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openModal = (user) => {
    setSelectedUser(user);
    setFormRole(user.role || 'student');
    setStudentId(user.studentId || '');
    setJoinYear(user.joinYear?.toString() || new Date().getFullYear().toString());
    setDepartment(user.department || 'CSE');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const payload = { role: formRole };

      if (formRole === 'faculty') {
        payload.joinYear = parseInt(joinYear, 10);
        payload.department = department;
      } else if (formRole === 'student') {
        if (studentId) payload.studentId = studentId;
      }

      await setUserRoleById(selectedUser._id, payload);
      toast.success('User role assigned successfully');
      fetchUsers();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign role');
    } finally {
      setSubmitting(false);
    }
  };

  // Apply search + role filter
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.studentId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">User Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Assign roles and generate employee IDs</p>
          </div>
        </div>
        <hr className="mt-4 mb-6 border-slate-100" />
      </div>

      {/* Search & Role Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-9 w-full"
          />
        </div>

        {/* Role filter dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Filter by role
          </label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="form-input text-sm"
          >
            <option value="all">All Roles</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Admin</option>
            <option value="hostelAdmin">Hostel Admin</option>
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ALL_ROLES.map(role => {
          const count = users.filter(u => u.role === role).length;
          return (
            <button
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
              className={`card px-4 py-3 text-left transition-all border-2 ${
                roleFilter === role ? 'border-primary-400 bg-primary-50/40' : 'border-transparent'
              }`}
            >
              <p className="text-2xl font-bold text-slate-900">{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{ROLE_LABELS[role]}s</p>
            </button>
          );
        })}
      </div>

      {/* User Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">User</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">Identifiers</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="4" className="py-12 text-center"><Spinner /></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="4" className="py-12 text-center text-slate-400 text-sm">No users found.</td></tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={ROLE_COLORS[user.role] || 'secondary'}>
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {user.employeeId && (
                        <div className="text-xs text-slate-600 flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Emp: <span className="font-mono font-medium">{user.employeeId}</span>
                        </div>
                      )}
                      {user.studentId && (
                        <div className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                          <GraduationCap className="w-3 h-3" /> Std: <span className="font-mono font-medium">{user.studentId}</span>
                        </div>
                      )}
                      {!user.employeeId && !user.studentId && <span className="text-xs text-slate-400 italic">None</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openModal(user)}
                        className="text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Assign Role
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Assign Role</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>

            <form onSubmit={handleAssignRole} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-4">
                  Assigning role for <span className="font-semibold text-slate-900">{selectedUser?.name}</span> ({selectedUser?.email})
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="form-input"
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Admin</option>
                  <option value="hostelAdmin">Hostel Admin</option>
                </select>
              </div>

              {/* Faculty-specific fields */}
              {formRole === 'faculty' && (
                <div className="p-4 bg-primary-50/50 rounded-xl space-y-4 border border-primary-100/50 mt-4">
                  <h4 className="text-sm font-semibold text-primary-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary-600" /> Faculty Details
                  </h4>
                  <p className="text-xs text-primary-700 leading-relaxed mb-2">
                    An Employee ID will be auto-generated (e.g. FAC001).
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3"/>Join Year</label>
                      <input
                        type="number"
                        required
                        value={joinYear}
                        onChange={(e) => setJoinYear(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1"><Building2 className="w-3 h-3"/>Department</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. CSE"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Student-specific fields */}
              {formRole === 'student' && (
                <div className="space-y-1.5 mt-4">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Student ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 2024CSE001"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="form-input"
                  />
                </div>
              )}

              {/* Hostel Admin info banner */}
              {formRole === 'hostelAdmin' && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 mt-4">
                  <h4 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                    <Home className="w-4 h-4 text-amber-600" /> Hostel Admin
                  </h4>
                  <p className="text-xs text-amber-700 leading-relaxed mt-1">
                    This user will be able to manage hostel rooms and applications. An Employee ID will be auto-generated (e.g. HAD001).
                  </p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                  {submitting ? <Spinner size="sm" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
