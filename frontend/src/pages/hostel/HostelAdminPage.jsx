import { useState, useEffect } from 'react';
import { getAllHostelApplications, updateHostelApplicationStatus } from '../../api/hostel';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { Home, Check, X, RefreshCw } from 'lucide-react';

const STATUS_TABS = ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'];

const statusVariant = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Cancelled: 'default',
};

export default function HostelAdminPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [acting, setActing] = useState(null); 

  const fetchApplications = async (tab = activeTab) => {
    setLoading(true);
    try {
      const params = tab !== 'All' ? { status: tab } : {};
      const res = await getAllHostelApplications(params);
      setApplications(res.data.applications || []);
    } catch {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(activeTab);
  }, [activeTab]);

  const handleAction = async (id, status) => {
    setActing(id);
    try {
      const res = await updateHostelApplicationStatus(id, { status });
      toast.success(res.data?.message || `Application ${status.toLowerCase()} successfully`);
      fetchApplications(activeTab);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${status.toLowerCase()} application`);
    } finally {
      setActing(null);
    }
  };

  const counts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
            <Home size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Hostel Applications</h1>
            <p className="text-sm text-slate-500">{applications.length} application{applications.length !== 1 ? 's' : ''} shown</p>
          </div>
        </div>
        <button
          onClick={() => fetchApplications(activeTab)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-100' },
          { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-100' },
          { label: 'Cancelled', color: 'bg-slate-50 text-slate-600 border-slate-100' },
        ].map(({ label, color }) => (
          <div key={label} className={`${color} border rounded-xl px-4 py-3`}>
            <p className="text-2xl font-bold">{counts[label] || 0}</p>
            <p className="text-xs font-semibold mt-0.5 uppercase tracking-wider opacity-70">{label}</p>
          </div>
        ))}
      </div>

      {}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {}
        <div className="flex border-b border-slate-100 px-4 pt-2 gap-1 overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : applications.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Home size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} applications</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-6 py-3 font-semibold">Student</th>
                  <th className="text-left px-6 py-3 font-semibold">Ref No.</th>
                  <th className="text-left px-6 py-3 font-semibold">Hostel</th>
                  <th className="text-left px-6 py-3 font-semibold">Room / Category</th>
                  <th className="text-left px-6 py-3 font-semibold">Year</th>
                  <th className="text-left px-6 py-3 font-semibold">Applied On</th>
                  <th className="text-left px-6 py-3 font-semibold">Status</th>
                  <th className="text-right px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {applications.map(app => (
                  <tr key={app._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{app.studentId?.name || '—'}</p>
                      <p className="text-xs text-slate-400">{app.studentId?.email || '—'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono text-slate-500">{app.hostelApplicationNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700">{app.hostel}</span>
                      <span className="ml-1 text-xs text-slate-400">({app.gender})</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700">{app.roomNumber || <span className="text-xs text-slate-400 italic">Auto-assign</span>}</p>
                      <p className="text-xs text-slate-400">{app.roomCategory}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{app.year}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusVariant[app.status] || 'default'}>{app.status}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      {app.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={acting === app._id}
                            onClick={() => handleAction(app._id, 'Approved')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            {acting === app._id ? <Spinner size="xs" /> : <Check size={12} />}
                            Approve
                          </button>
                          <button
                            disabled={acting === app._id}
                            onClick={() => handleAction(app._id, 'Rejected')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
                          >
                            <X size={12} />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 text-right block">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
