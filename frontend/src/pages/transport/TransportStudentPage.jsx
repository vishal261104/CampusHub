import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bus, Clock, Ticket as TicketIcon, IndianRupee,
  CheckCircle2, X, CreditCard, Users, CalendarDays, ArrowRight, Info
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  getTimetable, bookTicketFromTimetable, confirmTicketPayment,
  getMyTickets, cancelTicket
} from '../../api/transport';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

function fmtINR(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}


function TransportPaymentModal({ slot, bus, onClose, onSuccess }) {
  const [step, setStep] = useState('init'); 
  const [elementReady, setElementReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const stripeRef = useRef(null);
  const mountedRef = useRef(false);

  const initPayment = useCallback(async () => {
    try {
      setStep('init');
      const res = await bookTicketFromTimetable(slot._id);
      const { clientSecret, publishableKey } = res.data;

      if (!publishableKey || publishableKey.includes('your_stripe')) {
        setError('Payment gateway is not configured.');
        setStep('error');
        return;
      }

      const stripe = await loadStripe(publishableKey);
      const elements = stripe.elements({ clientSecret });
      stripeRef.current = { stripe, elements, clientSecret };
      setStep('stripe');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initialize payment');
      setStep('error');
    }
  }, [slot._id]);

  useEffect(() => { initPayment(); }, [initPayment]);

  useEffect(() => {
    if (step !== 'stripe') return;
    if (mountedRef.current) return;
    if (!stripeRef.current) return;

    const container = document.getElementById('stripe-transport-element');
    if (!container) return;

    mountedRef.current = true;
    const { elements } = stripeRef.current;
    const paymentEl = elements.create('payment', { layout: { type: 'accordion', defaultCollapsed: false } });
    paymentEl.on('ready', () => setElementReady(true));
    paymentEl.mount('#stripe-transport-element');
    stripeRef.current.paymentEl = paymentEl;

    return () => {
      try { paymentEl.unmount(); } catch (_) {}
      mountedRef.current = false;
      setElementReady(false);
    };
  }, [step]);

  const handlePay = async () => {
    if (!stripeRef.current || !elementReady || isProcessing) return;
    const { stripe, elements, clientSecret } = stripeRef.current;

    setIsProcessing(true);
    setError('');

    const { error: stripeErr } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: window.location.href },
    });

    if (stripeErr) {
      setError(stripeErr.message || 'Payment failed');
      setIsProcessing(false);
      return;
    }

    setStep('confirming');

    const intentId = clientSecret.split('_secret_')[0];
    try {
      const res = await Promise.race([
        confirmTicketPayment(intentId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out.')), 15000)),
      ]);
      onSuccess(res.data.ticket);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Booking confirmation failed');
      setStep('stripe');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={!isProcessing ? onClose : undefined}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600"><TicketIcon size={18} /></div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{step === 'done' ? 'Booking Confirmed!' : 'Book Ticket'}</h2>
              <p className="text-xs text-slate-400">{slot.from} → {slot.to} · {slot.departureTime}</p>
            </div>
          </div>
          {!isProcessing && step !== 'confirming' && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
          )}
        </div>

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {step === 'init' && <div className="py-10 flex justify-center"><Spinner size="md" /></div>}

          {step === 'error' && (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-rose-600 bg-rose-50 p-3 rounded-xl">{error}</p>
              <Button variant="secondary" onClick={onClose}>Close</Button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">Payment Successful!</p>
                <p className="text-sm text-slate-500 mt-1">Your seat is reserved for Bus {bus.busNumber}.</p>
              </div>
              <Button className="w-full" onClick={onClose}>Done</Button>
            </div>
          )}

          {step === 'confirming' && (
            <div className="text-center py-10 space-y-3">
              <Spinner size="lg" />
              <p className="text-sm text-slate-500">Confirming your booking...</p>
            </div>
          )}

          {step === 'stripe' && (
            <div className="space-y-4">
              {}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Bus</span>
                  <span className="text-sm font-bold text-slate-900">Bus {bus.busNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Route</span>
                  <span className="text-sm font-semibold text-slate-800">{slot.from} → {slot.to}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Departure</span>
                  <span className="text-sm font-semibold text-slate-800">{slot.departureTime}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-2 mt-1">
                  <span className="text-sm font-semibold text-slate-600">Total Fare</span>
                  <span className="text-xl font-bold text-slate-900">{fmtINR(bus.fare)}</span>
                </div>
              </div>

              {!elementReady && (
                <div className="flex justify-center gap-2 py-4 text-slate-400">
                  <Spinner size="sm" /> <span className="text-xs">Loading secure checkout...</span>
                </div>
              )}
              <div id="stripe-transport-element" className={elementReady ? '' : 'h-0 overflow-hidden'} />

              {error && <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" onClick={onClose} disabled={isProcessing}>Cancel</Button>
                <Button className="flex-1 gap-2" onClick={handlePay} disabled={!elementReady || isProcessing}>
                  {isProcessing
                    ? <><Spinner size="sm" /> Processing...</>
                    : <><CreditCard size={14} /> Pay {fmtINR(bus.fare)}</>
                  }
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function TimetableView({ groups, bookedSlotCounts, onBook }) {
  if (groups.length === 0) {
    return (
      <div className="card p-10 text-center text-slate-400">
        <Bus size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No trips scheduled for this day type.</p>
        <p className="text-xs mt-1 text-slate-300">Contact admin if this is incorrect.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {groups.map(({ bus, slots }) => (
        <div key={bus._id} className="card overflow-hidden">
          {}
          <div className="bg-slate-800 text-white px-5 py-3 flex justify-between items-center">
            <div>
              <p className="font-bold">Bus {bus.busNumber}</p>
              <p className="text-xs text-slate-300">{bus.registrationNumber} · {fmtINR(bus.fare)}/trip</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-300">Capacity</p>
              <p className="font-bold">{bus.capacity} seats</p>
            </div>
          </div>

          {}
          <div className="grid grid-cols-4 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-2 border-b border-slate-200">
            <span>From</span><span>To</span><span>Time</span><span></span>
          </div>

          {}
          {slots.map(slot => {
            const count = bookedSlotCounts[slot._id] || 0;
            const maxReached = count >= 2;
            const isLast = slot.note?.toLowerCase().includes('last');
            const isTentative = slot.note?.toLowerCase().includes('tentative');

            return (
              <div
                key={slot._id}
                className={`grid grid-cols-4 items-center px-4 py-3 border-b border-slate-100 last:border-0 transition-colors ${count > 0 ? 'bg-emerald-50/30' : isLast ? 'bg-yellow-50' : 'hover:bg-slate-50'}`}
              >
                <span className="text-sm text-slate-700 font-medium">{slot.from}</span>
                <span className="text-sm text-slate-700 font-medium">{slot.to}</span>
                <div>
                  <p className={`text-sm font-bold ${isLast ? 'text-amber-800' : 'text-slate-900'}`}>{slot.departureTime}</p>
                  {slot.note && <p className={`text-[10px] font-bold uppercase tracking-wide ${isTentative ? 'text-rose-500' : 'text-amber-700'}`}>{slot.note}</p>}
                </div>
                <div className="flex justify-end gap-2 items-center">
                  {count > 0 && (
                     <Badge variant="success" className="text-[10px] px-1.5 py-0.5"><CheckCircle2 size={10} className="mr-1" /> {count} Booked</Badge>
                  )}
                  {!maxReached && (
                    <button
                      onClick={() => onBook(slot, bus)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all bg-sky-600 hover:bg-sky-700 text-white shadow-sm`}
                    >
                      Book
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {}
          {bus.conductorName && (
            <div className="px-4 py-2 bg-blue-50 text-xs text-blue-700 border-t border-blue-100">
              🎫 {bus.conductorName} · {bus.conductorPhone}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


export default function TransportStudentPage() {
  const [timetable, setTimetable] = useState({ weekday: [], weekend: [], guidelines: [] });
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketTab, setTicketTab] = useState('active');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedBus, setSelectedBus] = useState(null);

  const today = new Date();
  const dayType = isWeekend(today) ? 'weekend' : 'weekday';
  const dayLabel = isWeekend(today) ? 'Saturday & Sunday' : 'Monday – Friday';

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tRes, tkRes] = await Promise.all([getTimetable(), getMyTickets()]);
      setTimetable(tRes.data);
      setTickets(tkRes.data.tickets);
    } catch { toast.error("Failed to load transport data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleBookingSuccess = () => {
    setSelectedSlot(null);
    setSelectedBus(null);
    fetchAll();
    toast.success('Ticket booked! Check "My Tickets".');
  };

  const handleCancel = async (ticketId) => {
    if (!confirm('Cancel this ticket? Your seat will be released.')) return;
    try {
      await cancelTicket(ticketId);
      toast.success('Ticket cancelled.');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Cancellation failed'); }
  };

  
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayTickets = tickets.filter(t => {
    const booked = new Date(t.bookedAt);
    return booked >= todayStart && t.bookingStatus !== 'Cancelled';
  });
  
  const bookedSlotCounts = {};
  todayTickets.forEach(t => {
    const slotId = t.scheduleId?.timetableSlotId;
    if (slotId) {
      bookedSlotCounts[slotId] = (bookedSlotCounts[slotId] || 0) + 1;
    }
  });

  const groups = dayType === 'weekday' ? timetable.weekday : timetable.weekend;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600">
            <Bus size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Campus Transport</h1>
            <p className="text-sm text-slate-500">Book bus tickets for today · {today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {}
        <div className="lg:col-span-2 space-y-4">
          {}
          <div className="flex items-center gap-3">
            <CalendarDays size={18} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900">Today's Timetable</h2>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${dayType === 'weekday' ? 'bg-slate-800 text-white' : 'bg-amber-600 text-white'}`}>
              {dayLabel}
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center"><Spinner size="lg" /></div>
          ) : (
            <TimetableView
              groups={groups}
              bookedSlotCounts={bookedSlotCounts}
              onBook={(slot, bus) => { setSelectedSlot(slot); setSelectedBus(bus); }}
            />
          )}

          {}
          {!loading && timetable.guidelines?.length > 0 && (
            <div className="card p-4">
              <p className="text-sm font-bold text-slate-900 mb-2">📋 Guidelines</p>
              <ol className="space-y-1 list-decimal list-inside">
                {timetable.guidelines.map((g, i) => (
                  <li key={i} className="text-xs text-slate-600">{g}</li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TicketIcon size={18} className="text-slate-400" /> My Tickets
          </h2>

          {}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {[['active', 'Active'], ['history', 'History']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTicketTab(key)}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${ticketTab === key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {loading ? <div className="py-8 flex justify-center"><Spinner size="md" /></div> : (() => {
              const filtered = ticketTab === 'active'
                ? tickets.filter(t => t.bookingStatus === 'Booked')
                : tickets.filter(t => t.bookingStatus !== 'Booked');

              if (filtered.length === 0) return (
                <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-6 text-center text-slate-400">
                  <TicketIcon size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{ticketTab === 'active' ? 'No active tickets.' : 'No past tickets.'}</p>
                </div>
              );

              return filtered.map(t => (
                <div key={t._id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm relative overflow-hidden">
                  {t.bookingStatus === 'Cancelled' && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                      <span className="bg-rose-100 text-rose-700 font-bold px-3 py-1 rounded-full text-xs rotate-[-15deg] border border-rose-200">CANCELLED</span>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-sky-100">
                      Bus {t.scheduleId?.busId?.busNumber}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Seat No</p>
                      <p className="text-xl font-black text-slate-800 leading-none mt-0.5">{t.seatNumber}</p>
                    </div>
                  </div>

                  <div className="space-y-1 mb-3">
                    <p className="text-sm font-bold text-slate-900">{t.scheduleId?.departureLocation} → {t.scheduleId?.destination}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      {new Date(t.scheduleId?.date).toLocaleDateString()} · {t.scheduleId?.departureTime}
                    </p>
                    <p className="text-xs text-emerald-700 font-bold">{fmtINR(t.fare)}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3 mt-1">
                    <Badge variant={t.bookingStatus === 'Booked' ? 'success' : 'secondary'}>
                      {t.bookingStatus}
                    </Badge>
                    {t.bookingStatus === 'Booked' && t.scheduleId?.status === 'Scheduled' && (
                      <button
                        onClick={() => handleCancel(t._id)}
                        className="text-xs text-rose-500 hover:text-rose-700 font-semibold hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {}
      {selectedSlot && selectedBus && (
        <TransportPaymentModal
          slot={selectedSlot}
          bus={selectedBus}
          onClose={() => { setSelectedSlot(null); setSelectedBus(null); }}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
