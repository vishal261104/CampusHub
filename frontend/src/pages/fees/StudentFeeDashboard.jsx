import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { getMyFeeDashboard, createPaymentIntent, confirmPayment, getPaymentHistory } from '../../api/fee';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import {
  IndianRupee, CalendarDays, CheckCircle2, Clock, AlertTriangle,
  BookOpen, Home, ClipboardList, Library, Wrench, CreditCard, History, X, ArrowRight, FileText
} from 'lucide-react';


function fmtINR(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function daysUntil(d) {
  if (!d) return null;
  const diff = new Date(d) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const SEMESTER_GRADIENT = {
  Spring: 'from-emerald-500 to-teal-600',
  Summer: 'from-amber-500 to-orange-600',
  Fall:   'from-orange-500 to-rose-600',
  Winter: 'from-sky-500 to-blue-600',
};

const CATEGORY_ICON = {
  'Tuition Fee': BookOpen,
  'Hostel Fee':  Home,
  'Exam Fee':    ClipboardList,
  'Library Fee': Library,
  'Other':       Wrench,
};

const STATUS_CFG = {
  Paid:    { label: 'Fully Paid',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  Partial: { label: 'Partially Paid', cls: 'bg-amber-50  text-amber-700  border-amber-200',    icon: Clock },
  Pending: { label: 'Payment Pending', cls: 'bg-rose-50  text-rose-700   border-rose-200',     icon: AlertTriangle },
};


function PaymentModal({ record, onClose, onSuccess }) {
  const [amount, setAmount]             = useState('');
  const [step, setStep]                 = useState('amount');
  const [elementReady, setElementReady] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  const stripeRef  = useRef(null);  
  const mountedRef = useRef(false);

  const pending = record.totalAmount - record.paidAmount;

  const setPreset = (pct) => {
    const val = Math.ceil((pending * pct) / 100);
    setAmount(String(Math.min(val, pending)));
  };

  
  const destroyStripeElement = () => {
    if (stripeRef.current?.paymentEl) {
      try { stripeRef.current.paymentEl.unmount(); } catch (_) {}
    }
    stripeRef.current  = null;
    mountedRef.current = false;
    setElementReady(false);
  };

  
  useEffect(() => {
    return () => destroyStripeElement();
  }, []);

  
  
  
  useEffect(() => {
    if (step !== 'stripe') return;
    if (mountedRef.current) return;
    if (!stripeRef.current) return;

    const container = document.getElementById('stripe-payment-element');
    if (!container) return;

    mountedRef.current = true;
    const { elements } = stripeRef.current;

    const paymentEl = elements.create('payment', {
      layout: { type: 'accordion', defaultCollapsed: false },
    });

    paymentEl.on('ready', () => setElementReady(true));
    paymentEl.mount('#stripe-payment-element');

    
    stripeRef.current.paymentEl = paymentEl;
    
  }, [step]);

  
  const handleProceed = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 50) return setError('Enter a valid amount (min ₹50)');
    if (amt > pending)          return setError(`Amount cannot exceed pending ₹${pending}`);
    setError('');
    setLoading(true);

    try {
      const res = await createPaymentIntent({ feeRecordId: record._id, amount: amt });
      const { clientSecret, publishableKey } = res.data;

      if (!publishableKey || publishableKey.includes('your_stripe')) {
        setError('Payment gateway is not configured yet. Please contact the administrator.');
        return;
      }

      const stripe   = await loadStripe(publishableKey);
      const elements = stripe.elements({ clientSecret });

      stripeRef.current  = { stripe, elements, clientSecret };
      mountedRef.current = false;
      setElementReady(false);
      setStep('stripe');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error?.message || 'Failed to start payment';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  
  
  const handlePay = async () => {
    if (!stripeRef.current || !elementReady) return;

    
    const { stripe, elements, clientSecret } = stripeRef.current;

    setStep('processing');

    const { error: stripeErr } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (stripeErr) {
      setError(stripeErr.message || 'Payment failed');
      setStep('stripe');
      return;
    }

    const intentId = clientSecret.split('_secret_')[0];

    try {
      const res = await confirmPayment({ paymentIntentId: intentId });
      onSuccess(res.data.feeRecord);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.message || 'Payment verification failed');
      setStep('stripe');
    }
  };

  
  const handleBack = () => {
    destroyStripeElement();
    setStep('amount');
    setError('');
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {step === 'done' ? 'Payment Successful' : 'Pay Fees'}
              </h2>
              <p className="text-xs text-slate-400">
                Pending: {fmtINR(pending)}
              </p>
            </div>
          </div>
          {step !== 'processing' && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="px-6 py-5">
          {}
          {step === 'done' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{fmtINR(parseFloat(amount))} Paid!</p>
                <p className="text-sm text-slate-500 mt-1">Your fee record has been updated</p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {}
          {step === 'amount' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Amount to Pay (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₹</span>
                  <input
                    type="number"
                    min="50"
                    max={pending}
                    step="1"
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setError(''); }}
                    placeholder={String(pending)}
                    className="w-full pl-7 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all bg-white font-mono"
                  />
                </div>
                {}
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      onClick={() => setPreset(pct)}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition-colors"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Enter any amount between ₹50 and {fmtINR(pending)}
                </p>
              </div>

              {error && (
                <p className="text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>
              )}

              <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Total Fees</span><span className="font-semibold">{fmtINR(record.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Already Paid</span><span className="font-semibold">{fmtINR(record.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-rose-600 border-t border-slate-200 pt-1.5 mt-1.5">
                  <span>Pending</span><span className="font-bold">{fmtINR(pending)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleProceed}
                  disabled={loading || !amount}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Spinner size="xs" /> : <><ArrowRight size={14} /> Proceed to Pay</>}
                </button>
              </div>
            </div>
          )}

          {}
          {step === 'processing' && (
            <div className="text-center space-y-4 py-6">
              <Spinner size="lg" />
              <p className="text-sm text-slate-500">Processing your payment…</p>
            </div>
          )}

          {}
          {}
          {(step === 'stripe' || step === 'processing') && (
            <div className={step === 'processing' ? 'hidden' : 'space-y-4'}>
              <div className="bg-slate-50 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-sm text-slate-600">Paying</span>
                <span className="text-base font-bold text-slate-900">{fmtINR(parseFloat(amount))}</span>
              </div>

              {}
              {!elementReady && (
                <div className="flex items-center justify-center gap-2 py-6 text-slate-400">
                  <Spinner size="sm" />
                  <span className="text-xs">Loading payment form…</span>
                </div>
              )}

              {}
              <div id="stripe-payment-element" className={elementReady ? '' : 'h-0 overflow-hidden'} />

              {error && (
                <p className="text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3">
                <button onClick={handleBack} className="flex-1 py-2.5 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                  ← Back
                </button>
                <button
                  onClick={handlePay}
                  disabled={!elementReady}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CreditCard size={14} /> Pay {fmtINR(parseFloat(amount))}
                </button>
              </div>

              <p className="text-[10px] text-center text-slate-400">
                🔒 Secured by Stripe · Supports UPI, Cards & Net Banking
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function PaymentHistory({ feeRecordId, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await getPaymentHistory(feeRecordId);
        setHistory(res.data.payments || []);
      } catch { toast.error('Failed to load history'); }
      finally { setLoading(false); }
    })();
  }, [feeRecordId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600"><History size={16} /></div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Payment History</h2>
              <p className="text-xs text-slate-400">All successful transactions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>
        <div className="px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-8"><Spinner size="lg" /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <History size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No payments made yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map((p, i) => (
                <div key={i} className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800">{fmtINR(p.amount)}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                          <CheckCircle2 size={9} /> Paid
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{fmtDateTime(p.createdAt)}</p>
                      {p.receiptNumber && (
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{p.receiptNumber}</p>
                      )}
                    </div>
                  </div>

                  {}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { onClose(); navigate(`/fees/receipt/${p._id}`); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      <FileText size={11} /> Download Receipt
                    </button>
                    {p.receiptUrl && (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] text-sky-600 hover:underline font-semibold"
                      >
                        Stripe Receipt ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function AmountCard({ label, value, color }) {
  return (
    <div className={`${color} rounded-2xl p-5 flex flex-col gap-1`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-2xl font-bold">{fmtINR(value)}</p>
    </div>
  );
}


export default function StudentFeeDashboard() {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await getMyFeeDashboard();
      setData(res.data);
    } catch {
      
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handlePaymentSuccess = (updatedRecord) => {
    setData(prev => prev ? { ...prev, record: updatedRecord } : prev);
    toast.success('Payment successful! 🎉');
    setShowPayment(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  if (!data?.activeSemester || !data?.record) {
    return (
      <div className="max-w-xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><IndianRupee size={20} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Fees</h1>
            <p className="text-sm text-slate-500">Semester-wise fee summary</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400">
          <CalendarDays size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No active semester at the moment</p>
          <p className="text-xs mt-1 opacity-60">Your fee details will appear here once the admin activates a semester</p>
        </div>
      </div>
    );
  }

  const { record, activeSemester } = data;
  const { semester, year, dueDate } = activeSemester;
  const pending   = record.totalAmount - record.paidAmount;
  const paidPct   = record.totalAmount > 0 ? Math.round((record.paidAmount / record.totalAmount) * 100) : 0;
  const days      = daysUntil(dueDate);
  const isOverdue = days !== null && days < 0;
  const gradient  = SEMESTER_GRADIENT[semester] || 'from-slate-500 to-slate-700';
  const statusCfg = STATUS_CFG[record.status] || STATUS_CFG['Pending'];
  const StatusIcon = statusCfg.icon;

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><IndianRupee size={20} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Fees</h1>
            <p className="text-sm text-slate-500">Current semester fee summary</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <History size={12} /> Payment History
          </button>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${statusCfg.cls}`}>
            <StatusIcon size={11} />{statusCfg.label}
          </span>
        </div>
      </div>

      {}
      <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white shadow-lg`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm font-semibold opacity-80 uppercase tracking-widest">{semester} {year}</p>
            <p className="text-4xl font-bold mt-1">{fmtINR(record.totalAmount)}</p>
            <p className="text-sm opacity-80 mt-1">Total fees for this semester</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-70 uppercase tracking-wider">Due Date</p>
            <p className="text-lg font-bold">{fmtDate(dueDate)}</p>
            {days !== null && (
              <p className={`text-xs mt-0.5 font-semibold ${isOverdue ? 'text-rose-200' : 'opacity-70'}`}>
                {isOverdue
                  ? `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`
                  : days === 0 ? 'Due today'
                  : `${days} day${days !== 1 ? 's' : ''} remaining`}
              </p>
            )}
          </div>
        </div>
        {}
        <div className="mt-5">
          <div className="flex justify-between text-xs opacity-80 mb-1.5">
            <span>{paidPct}% paid</span>
            <span>{fmtINR(record.paidAmount)} of {fmtINR(record.totalAmount)}</span>
          </div>
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${paidPct}%` }} />
          </div>
        </div>
      </div>

      {}
      <div className="grid grid-cols-3 gap-3">
        <AmountCard label="Total Fees" value={record.totalAmount} color="bg-slate-50 border border-slate-200 text-slate-700" />
        <AmountCard label="Paid" value={record.paidAmount} color="bg-emerald-50 border border-emerald-100 text-emerald-700" />
        <AmountCard label="Pending" value={pending} color={pending > 0 ? 'bg-rose-50 border border-rose-100 text-rose-700' : 'bg-emerald-50 border border-emerald-100 text-emerald-700'} />
      </div>

      {}
      {pending > 0 && (
        <div className={`rounded-2xl border px-5 py-4 flex items-center justify-between gap-4 ${
          isOverdue ? 'bg-rose-50 border-rose-200' : days !== null && days <= 7 ? 'bg-amber-50 border-amber-200' : 'bg-sky-50 border-sky-200'
        }`}>
          <div className="flex items-center gap-3">
            {isOverdue ? <AlertTriangle size={18} className="text-rose-600 flex-shrink-0" /> : <CalendarDays size={18} className="text-sky-600 flex-shrink-0" />}
            <p className="text-sm text-slate-700">
              {isOverdue
                ? <><strong className="text-rose-700">Overdue by {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''}.</strong> Please pay immediately.</>
                : days === 0
                  ? <><strong>Due today.</strong> Pay <strong>{fmtINR(pending)}</strong> now.</>
                  : <>Pay <strong>{fmtINR(pending)}</strong> by <strong>{fmtDate(dueDate)}</strong></>
              }
            </p>
          </div>
          <button
            onClick={() => setShowPayment(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm whitespace-nowrap"
          >
            <CreditCard size={14} /> Pay Now
          </button>
        </div>
      )}

      {}
      {record.status === 'Paid' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-700 text-sm">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <p>All fees for <strong>{semester} {year}</strong> have been paid. You're all set! 🎉</p>
        </div>
      )}

      {}
      {record.feeBreakdown?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fee Breakdown</p>
          </div>
          <div className="divide-y divide-slate-100">
            {record.feeBreakdown.map((item, i) => {
              const Icon = CATEGORY_ICON[item.category] || Wrench;
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{item.label}</p>
                    <p className="text-[11px] text-slate-400">{item.category}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-700">{fmtINR(item.amount)}</p>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <p className="text-xs font-semibold text-slate-500">Total</p>
            <p className="text-base font-bold text-slate-900">{fmtINR(record.totalAmount)}</p>
          </div>
        </div>
      )}

      {record.paymentNote && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-500">
          <span className="font-semibold">Payment note: </span>{record.paymentNote}
        </div>
      )}

      {}
      {showPayment && (
        <PaymentModal record={record} onClose={() => setShowPayment(false)} onSuccess={handlePaymentSuccess} />
      )}
      {showHistory && (
        <PaymentHistory feeRecordId={record._id} onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}
