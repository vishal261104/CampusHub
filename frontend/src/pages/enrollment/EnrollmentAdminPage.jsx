import { useState, useEffect } from 'react';
import { getAdminEnrollmentRequests, updateEnrollmentRequestStatus } from '../../api/enrollments';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Inbox, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function EnrollmentAdminPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await getAdminEnrollmentRequests({ status: 'Pending_Enroll,Pending_Drop' });
      setRequests(res.data.requests || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id, action) => {
    setProcessingId(id);
    try {
      await updateEnrollmentRequestStatus(id, { action });
      toast.success(`Request ${action}d successfully`);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} request`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
          <Inbox size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Enrollment Requests</h1>
          <p className="text-sm text-slate-500">Review pending enrollments and drops. Watch out for timetable clashes.</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-slate-800">All caught up!</h3>
          <p className="text-slate-500 mt-1">There are no pending enrollment requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const student = req.studentId || {};
            const offering = req.courseOfferingId || {};
            const course = offering.courseId || {};
            const isEnroll = req.status === 'Pending_Enroll';
            const isProcessing = processingId === req._id;

            return (
              <div key={req._id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row gap-5 md:items-center justify-between transition-all hover:border-slate-300">
                
                {}
                <div className="flex-1 flex flex-col gap-4">
                  {}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={isEnroll ? 'primary' : 'warning'}>
                      {isEnroll ? 'Enroll Request' : 'Drop Request'}
                    </Badge>
                    {req.hasClash && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold uppercase tracking-wider border border-rose-200">
                        <AlertTriangle size={12} />
                        Timetable Clash Detected
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Student Details</p>
                      <h3 className="text-sm font-bold text-slate-900">{student.name}</h3>
                      <p className="text-xs text-slate-500 font-medium font-mono mt-0.5">{student.studentId} • {student.email}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Course Details</p>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">{course.courseCode}: {course.courseTitle}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {course.credits} Credits • {offering.semester} {offering.year}
                      </p>
                    </div>
                  </div>
                </div>

                {}
                <div className="flex gap-2 flex-col sm:flex-row md:flex-col lg:flex-row border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-5 shrink-0 justify-center">
                  <Button 
                    variant="danger" 
                    className="flex-1 md:flex-none justify-center px-4"
                    disabled={isProcessing}
                    loading={isProcessing}
                    onClick={() => handleAction(req._id, 'reject')}
                  >
                    <XCircle size={16} className="mr-1.5" /> Reject
                  </Button>
                  <Button 
                    variant="success" 
                    className="flex-1 md:flex-none justify-center px-4"
                    disabled={isProcessing}
                    loading={isProcessing}
                    onClick={() => handleAction(req._id, 'approve')}
                  >
                    <CheckCircle size={16} className="mr-1.5" /> Approve
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
