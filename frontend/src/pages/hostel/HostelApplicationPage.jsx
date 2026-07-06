import { useState, useEffect } from 'react';
import { getMyHostelApplication, applyForHostel, cancelHostelApplication } from '../../api/hostel';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { Home, ClipboardList, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

export default function HostelApplicationPage() {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allocation, setAllocation] = useState(null);

  
  const [formData, setFormData] = useState({
    roomCategory: '',
    roomNumber: ''
  });

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const res = await getMyHostelApplication();
      const app = res.data.application;
      
      
      if (app && (app.status === 'Pending' || app.status === 'Approved')) {
        setApplication(app);
        if (res.data.allocation) setAllocation(res.data.allocation);
      } else {
        setApplication(null);
        setAllocation(null);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        toast.error('Failed to load application status');
      }
      setApplication(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await applyForHostel(formData);
      toast.success('Hostel application submitted successfully!');
      fetchApplication();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your hostel application?')) return;
    try {
      await cancelHostelApplication(application._id);
      toast.success('Application cancelled successfully');
      fetchApplication();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel application');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved': return <Badge variant="success">Approved</Badge>;
      case 'Pending': return <Badge variant="warning">Pending</Badge>;
      case 'Rejected': return <Badge variant="danger">Rejected</Badge>;
      case 'Cancelled': return <Badge variant="default">Cancelled</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
          <Home size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hostel Management</h1>
          <p className="text-sm text-slate-500">Apply for residential accommodation and track your status</p>
        </div>
      </div>

      {application ? (
        
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <ClipboardList className="text-slate-400" size={24} />
              <div>
                <h2 className="text-lg font-bold text-slate-800">Your Application</h2>
                <p className="text-xs text-slate-500 font-medium">Ref: {application.hostelApplicationNumber}</p>
              </div>
            </div>
            {getStatusBadge(application.status)}
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Hostel Block</p>
                <p className="font-medium text-slate-800">{application.hostel}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Room Category</p>
                <p className="font-medium text-slate-800">{application.roomCategory}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pref. Room No</p>
                <p className="font-medium text-slate-800">{application.roomNumber || 'Auto-assign'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Applied On</p>
                <p className="font-medium text-slate-800">{new Date(application.appliedAt).toLocaleDateString()}</p>
              </div>
            </div>

            {application.status === 'Pending' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-800">Application Under Review</h4>
                  <p className="text-sm text-amber-700 mt-1">Your application is currently being reviewed by the hostel administration. You will be notified once a decision is made.</p>
                </div>
                <button 
                  onClick={handleCancel}
                  className="px-4 py-2 bg-white border border-amber-200 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-100 transition-colors"
                >
                  Cancel Application
                </button>
              </div>
            )}

            {application.status === 'Approved' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="text-emerald-500 mt-0.5 flex-shrink-0" size={18} />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-emerald-800">Application Approved!</h4>
                  {allocation?.roomId ? (
                    <div className="mt-2 bg-white border border-emerald-100 rounded-lg p-3">
                      <p className="text-sm font-semibold text-slate-800">Allocated Room: #{allocation.roomId.roomNumber}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {allocation.roomId.hostelBlock} · {allocation.roomId.hostelType} Hostel · Floor {allocation.roomId.floor} · {allocation.roomId.roomType}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-emerald-700 mt-1">Your hostel accommodation has been approved. Room allocation details will appear here.</p>
                  )}
                </div>
              </div>
            )}

            {application.status === 'Rejected' && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
                <XCircle className="text-rose-500 mt-0.5 flex-shrink-0" size={18} />
                <div>
                  <h4 className="text-sm font-semibold text-rose-800">Application Rejected</h4>
                  <p className="text-sm text-rose-700 mt-1">Unfortunately, your application could not be approved at this time. Please contact the administration for more details.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">New Application</h2>
            <p className="text-sm text-slate-500">Fill in the details below to apply for hostel accommodation for the upcoming academic year.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Room Category</label>
                <select 
                  name="roomCategory" 
                  required 
                  value={formData.roomCategory} 
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-100 focus:border-primary-400 outline-none transition-all"
                >
                  <option value="">Select Category</option>
                  <option value="Single">Single Room</option>
                  <option value="Double">Double Sharing</option>
                  <option value="Triple">Triple Sharing</option>
                  <option value="Quad">Quad Sharing</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Preferred Room Number <span className="text-slate-400 font-normal">(optional)</span></label>
                <input 
                  type="text" 
                  name="roomNumber" 
                  placeholder="e.g. A101 — leave blank for auto-assign"
                  value={formData.roomNumber} 
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-100 focus:border-primary-400 outline-none transition-all"
                />
                <p className="text-xs text-slate-400">If left empty, a room matching your category will be auto-assigned when approved.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                type="submit" 
                disabled={submitting}
                className="btn-primary py-2.5 px-6 disabled:opacity-70 flex items-center gap-2"
              >
                {submitting && <Spinner size="sm" />}
                Submit Application
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
