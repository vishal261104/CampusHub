import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Hash, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { registerStudent } from '../../api/users';
import toast from 'react-hot-toast';

const BRANCHES = [
  'Computer Science',
  'Electronics',
  'Mechanical',
  'Electrical',
  'Civil',
  'Information Technology',
];

const YEARS = ['21', '22', '23', '24', '25', '26'];

export default function StudentRegistrationPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ year: '', branch: '', gender: '' });
  const [loading, setLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState(null);

  
  if (user?.studentId && !generatedId) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Already Registered</h2>
          <p className="text-slate-500 text-sm mb-4">Your student ID has already been assigned.</p>
          <div className="inline-flex items-center gap-2 px-5 py-3 bg-primary-50 border border-primary-100 rounded-xl">
            <Hash size={16} className="text-primary-600" />
            <span className="text-lg font-bold font-mono text-primary-700">{user.studentId}</span>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary mt-6 w-full"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.year || !form.branch || !form.gender) {
      toast.error('All fields are required');
      return;
    }
    setLoading(true);
    try {
      const res = await registerStudent(form);
      const updatedUser = res.data.user;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setGeneratedId(res.data.studentId);
      toast.success('Student ID generated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  
  if (generatedId) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="card p-8 text-center animate-slide-up">
          <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={36} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Registration Complete!</h2>
          <p className="text-slate-500 text-sm mb-5">Your unique Student ID has been generated.</p>
          <div className="inline-flex items-center gap-3 px-6 py-4 bg-primary-50 border border-primary-100 rounded-2xl">
            <Hash size={20} className="text-primary-600" />
            <span className="text-2xl font-bold font-mono text-primary-700">{generatedId}</span>
          </div>
          <p className="text-xs text-slate-400 mt-4">This ID will be used across all modules — hostel, attendance, enrollment, etc.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary mt-6 w-full"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
          <GraduationCap size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Complete Registration</h1>
          <p className="text-sm text-slate-500">Fill in your academic details to generate your Student ID</p>
        </div>
      </div>

      <div className="card p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Admission Year</label>
            <select
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-100 focus:border-primary-400 outline-none transition-all"
            >
              <option value="">Select Year</option>
              {YEARS.map(y => <option key={y} value={y}>20{y}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Branch</label>
            <select
              value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-100 focus:border-primary-400 outline-none transition-all"
            >
              <option value="">Select Branch</option>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-100 focus:border-primary-400 outline-none transition-all"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {}
          {form.year && form.branch && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">ID Preview</p>
              <p className="text-lg font-bold font-mono text-slate-700">
                {form.year}
                {form.branch === 'Computer Science' ? 'CS' :
                 form.branch === 'Electronics' ? 'EC' :
                 form.branch === 'Mechanical' ? 'ME' :
                 form.branch === 'Electrical' ? 'EE' :
                 form.branch === 'Civil' ? 'CE' :
                 form.branch === 'Information Technology' ? 'IT' : '??'}
                <span className="text-slate-300">XXX</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">The counter will be auto-assigned on submit</p>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Hash size={16} />
                  Generate Student ID
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
