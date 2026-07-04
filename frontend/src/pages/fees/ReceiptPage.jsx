import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReceipt } from '../../api/fee';
import { Printer, ArrowLeft, CheckCircle2, GraduationCap } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';

function fmtINR(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function ReceiptPage() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await getReceipt(paymentId);
        setPayment(res.data.payment);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load receipt');
      } finally {
        setLoading(false);
      }
    })();
  }, [paymentId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Spinner size="lg" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-3">
        <p className="text-rose-600 font-semibold">{error}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-sky-600 hover:underline">Go back</button>
      </div>
    </div>
  );

  const student = payment?.studentId;
  const feeRecord = payment?.feeRecordId;

  return (
    <>
      {/* Action Bar — hidden during print */}
      <div className="print:hidden mb-6 bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Printer size={15} /> Print / Save as PDF
        </button>
      </div>

      {/* Receipt Content */}
      <div className="pb-10 print:py-0 print:px-0">
        <div
          id="receipt"
          className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none print:max-w-full"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-8 py-8 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <GraduationCap size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight">CampusHub ERP</h1>
                  <p className="text-emerald-200 text-xs font-medium uppercase tracking-widest">Official Fee Receipt</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end mb-1">
                  <CheckCircle2 size={16} className="text-emerald-300" />
                  <span className="text-sm font-semibold text-emerald-100">Payment Verified</span>
                </div>
                <p className="text-2xl font-extrabold">{payment?.receiptNumber || 'RCPT-PENDING'}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-7 space-y-6">
            {/* Two-column info */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <InfoRow label="Student Name" value={student?.name} />
              <InfoRow label="Student ID" value={student?.studentId || '—'} />
              <InfoRow label="Email" value={student?.email} />
              <InfoRow label="Semester" value={`${payment?.semester} ${payment?.year}`} />
              <InfoRow label="Payment Date" value={fmtDateTime(payment?.createdAt)} />
              <InfoRow label="Payment Status" value={
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full">
                  <CheckCircle2 size={10} /> Successful
                </span>
              } />
            </div>

            <hr className="border-slate-200" />

            {/* Amount paid */}
            <div className="bg-emerald-50 rounded-2xl px-6 py-5 flex items-center justify-between border border-emerald-100">
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Amount Paid</p>
                <p className="text-3xl font-extrabold text-emerald-800">{fmtINR(payment?.amount)}</p>
              </div>
              <CheckCircle2 size={40} className="text-emerald-400 opacity-60" />
            </div>

            {/* Fee breakdown */}
            {feeRecord?.feeBreakdown?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Fee Breakdown</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  {feeRecord.feeBreakdown.map((item, i) => (
                    <div key={i} className={`flex justify-between items-center px-4 py-3 text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      <div>
                        <p className="font-medium text-slate-800">{item.label}</p>
                        <p className="text-xs text-slate-400">{item.category}</p>
                      </div>
                      <p className="font-semibold text-slate-700">{fmtINR(item.amount)}</p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-4 py-3 bg-slate-100 border-t border-slate-200">
                    <p className="text-sm font-bold text-slate-700">Total Fee</p>
                    <p className="text-sm font-bold text-slate-900">{fmtINR(feeRecord.totalAmount)}</p>
                  </div>
                </div>
              </div>
            )}

            <hr className="border-slate-200" />

            {/* Transaction details */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transaction Details</p>
              <div className="bg-slate-50 rounded-xl px-4 py-4 space-y-2">
                <DetailRow label="Transaction ID" value={payment?.stripePaymentIntentId} mono />
                <DetailRow label="Receipt Number" value={payment?.receiptNumber} mono />
                <DetailRow label="Payment Method" value="Online (Stripe)" />
                {payment?.receiptUrl && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-medium">Stripe Receipt</span>
                    <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-600 hover:underline font-semibold">
                      View on Stripe →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-400">
              This is a system-generated receipt and does not require a signature.
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Generated on {fmtDate(new Date())} · CampusHub University Management System
            </p>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 0.5in; }
          .print\\:hidden { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <div className="text-sm font-semibold text-slate-800">{value || '—'}</div>
    </div>
  );
}

function DetailRow({ label, value, mono }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-slate-500 font-medium flex-shrink-0">{label}</span>
      <span className={`text-xs text-slate-800 font-semibold text-right break-all ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}
