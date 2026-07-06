import React, { useState, useEffect, useRef } from 'react';
import {
  Bus, Clock, Plus, Edit2, Trash2, Download, X, CheckCircle2,
  IndianRupee, Users, MapPin, AlertTriangle, GripVertical, FileText
} from 'lucide-react';
import {
  getAllBuses, createBus, updateBus, deleteBus,
  getTimetable, createTimetableSlot, updateTimetableSlot, deleteTimetableSlot,
  updateGuidelines, getBookings, getAnalytics
} from '../../api/transport';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

function fmtINR(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

function timeToMinutes(t) {
  if (!t) return 0;
  let [time, modifier] = t.split(' ');
  if (!time) return 0;
  let [hours, minutes] = time.split(':');
  hours = parseInt(hours, 10) || 0;
  minutes = parseInt(minutes, 10) || 0;
  if (hours === 12 && modifier?.toUpperCase() === 'AM') hours = 0;
  if (modifier?.toUpperCase() === 'PM' && hours < 12) hours += 12;
  return hours * 60 + minutes;
}

function sortGroupsByTime(groups) {
  return groups.map(g => {
    const sortedSlots = [...g.slots].sort((a, b) => timeToMinutes(a.departureTime) - timeToMinutes(b.departureTime));
    return { ...g, slots: sortedSlots };
  });
}


function AnalyticsTab({ loading, analytics }) {
  if (loading) return <div className="py-12 flex justify-center"><Spinner size="lg" /></div>;
  if (!analytics) return null;

  const stats = [
    { label: 'Total Revenue', value: fmtINR(analytics.totalRevenue), icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Tickets Booked', value: analytics.totalTickets, icon: Users, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Active Buses', value: `${analytics.activeBuses} / ${analytics.totalBuses}`, icon: Bus, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Completed Trips', value: `${analytics.completedTrips} / ${analytics.totalSchedules}`, icon: CheckCircle2, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <div key={i} className="card p-5 flex flex-col gap-2 shadow-sm">
          <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
            <s.icon size={20} className={s.color} />
          </div>
          <div className="mt-2">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}


function BusesTab() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(null);

  const fetchBuses = async () => {
    setLoading(true);
    try { const res = await getAllBuses(); setBuses(res.data.buses); }
    catch { toast.error("Failed to load buses"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBuses(); }, []);

  const blank = { busNumber: '', registrationNumber: '', capacity: 40, fare: 50, driverName: '', driverPhone: '', conductorName: '', conductorPhone: '', isActive: true };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (form._id) await updateBus(form._id, form);
      else await createBus(form);
      toast.success(`Bus ${form._id ? 'updated' : 'added'} successfully`);
      setShowModal(false);
      fetchBuses();
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this bus? This will fail if schedules exist.')) return;
    try { await deleteBus(id); toast.success('Bus deleted'); fetchBuses(); }
    catch (err) { toast.error(err.response?.data?.message || 'Cannot delete'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setForm({ ...blank }); setShowModal(true); }}>
          <Plus size={16} /> Add Bus
        </Button>
      </div>

      {loading ? <div className="py-12 flex justify-center"><Spinner size="lg" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {buses.map(b => (
            <div key={b._id} className="card p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-black text-slate-900">Bus {b.busNumber}</span>
                    <Badge variant={b.isActive ? 'success' : 'secondary'}>{b.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">{b.registrationNumber}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setForm({ ...b }); setShowModal(true); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-sky-600"><Edit2 size={15} /></button>
                  <button onClick={() => handleDelete(b._id)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-rose-600"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-lg font-black text-slate-900">{b.capacity}</p>
                  <p className="text-xs text-slate-500">Capacity</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-lg font-black text-emerald-700">{fmtINR(b.fare)}</p>
                  <p className="text-xs text-slate-500">Flat Fare</p>
                </div>
                <div className="bg-sky-50 rounded-xl p-3">
                  <p className="text-sm font-bold text-sky-700 truncate">{b.driverName.split(' ')[0]}</p>
                  <p className="text-xs text-slate-500">Driver</p>
                </div>
              </div>
              {(b.conductorName || b.conductorPhone) && (
                <p className="text-xs text-slate-500 mt-3">🎫 {b.conductorName} · {b.conductorPhone}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-slate-900">{form._id ? 'Edit Bus' : 'Add Bus'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold">Bus Number</label>
                  <input required value={form.busNumber} onChange={e => setForm({ ...form, busNumber: e.target.value })} className="form-input mt-1" placeholder="e.g. MH12 AB1234" />
                </div>
                <div>
                  <label className="text-sm font-semibold">Registration No.</label>
                  <input required value={form.registrationNumber} onChange={e => setForm({ ...form, registrationNumber: e.target.value })} className="form-input mt-1" placeholder="e.g. MP20ZL1297" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold">Capacity (seats)</label>
                  <input type="number" required min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} className="form-input mt-1" />
                </div>
                <div>
                  <label className="text-sm font-semibold">Flat Fare (₹) <span className="text-slate-400 font-normal text-xs">min ₹50</span></label>
                  <input type="number" required min="50" value={form.fare} onChange={e => setForm({ ...form, fare: Number(e.target.value) })} className="form-input mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold">Driver Name</label>
                  <input required value={form.driverName} onChange={e => setForm({ ...form, driverName: e.target.value })} className="form-input mt-1" />
                </div>
                <div>
                  <label className="text-sm font-semibold">Driver Phone</label>
                  <input required value={form.driverPhone} onChange={e => setForm({ ...form, driverPhone: e.target.value })} className="form-input mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold">Conductor Name <span className="text-slate-400 font-normal text-xs">optional</span></label>
                  <input value={form.conductorName} onChange={e => setForm({ ...form, conductorName: e.target.value })} className="form-input mt-1" />
                </div>
                <div>
                  <label className="text-sm font-semibold">Conductor Phone <span className="text-slate-400 font-normal text-xs">optional</span></label>
                  <input value={form.conductorPhone} onChange={e => setForm({ ...form, conductorPhone: e.target.value })} className="form-input mt-1" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-sky-600" />
                <label htmlFor="isActive" className="text-sm font-semibold text-slate-700">Active</label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button className="flex-1" type="submit">Save Bus</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


function TimetableTab() {
  const [timetable, setTimetable] = useState({ weekday: [], weekend: [] });
  const [buses, setBuses] = useState([]);
  const [guidelines, setGuidelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotForm, setSlotForm] = useState(null);
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);
  const [guidelinesDraft, setGuidelinesDraft] = useState('');
  const printRef = useRef(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tRes, bRes] = await Promise.all([getTimetable(), getAllBuses()]);
      setTimetable(tRes.data);
      setBuses(bRes.data.buses.filter(b => b.isActive));
      setGuidelines(tRes.data.guidelines || []);
    } catch { toast.error("Failed to load timetable"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAddSlot = (busId, dayType) => {
    setSlotForm({ busId, dayType, from: 'Campus', to: 'City', departureTime: '03:30 PM', note: '' });
    setShowSlotModal(true);
  };

  const handleEditSlot = (slot) => {
    setSlotForm({ ...slot, busId: slot.busId?._id || slot.busId });
    setShowSlotModal(true);
  };

  const handleSlotSubmit = async (e) => {
    e.preventDefault();
    try {
      if (slotForm._id) await updateTimetableSlot(slotForm._id, slotForm);
      else await createTimetableSlot(slotForm);
      toast.success(`Slot ${slotForm._id ? 'updated' : 'added'}`);
      setShowSlotModal(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteSlot = async (id) => {
    if (!confirm('Remove this slot from the timetable?')) return;
    try { await deleteTimetableSlot(id); toast.success('Slot removed'); fetchAll(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleSaveGuidelines = async () => {
    try {
      const items = guidelinesDraft.split('\n').map(s => s.trim()).filter(Boolean);
      await updateGuidelines(items);
      setGuidelines(items);
      setShowGuidelinesModal(false);
      toast.success('Guidelines saved');
    } catch { toast.error('Failed to save guidelines'); }
  };

  const handlePrint = () => {
    const el = document.getElementById('timetable-printview');
    if (el) el.style.display = 'block';
    window.print();
    setTimeout(() => { if (el) el.style.display = 'none'; }, 1000);
  };

  const NOTE_COLORS = { 'Tentative': 'text-rose-600 font-bold', 'Last Bus': 'text-amber-700 font-extrabold bg-yellow-100 px-1 rounded', '': '' };
  const noteClass = (note) => NOTE_COLORS[note] || (note ? 'text-rose-600 font-bold' : '');

  const renderBusColumns = (groups) => {
    groups = sortGroupsByTime(groups);
    if (groups.length === 0) return (
      <div className="col-span-full py-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
        <Bus size={28} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">No buses added to this timetable yet.</p>
        <p className="text-xs mt-1">Add slots below by selecting a bus.</p>
      </div>
    );

    return groups.map(({ bus, slots }) => (
      <div key={bus._id} className="border border-slate-200 rounded-xl overflow-hidden">
        {}
        <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">Bus {bus.busNumber}</p>
            <p className="text-xs text-slate-300">{bus.registrationNumber} · {fmtINR(bus.fare)}/trip</p>
          </div>
          <Badge variant="secondary" className="text-xs">{bus.capacity} seats</Badge>
        </div>
        {}
        <div className="grid grid-cols-4 bg-slate-100 text-xs font-bold text-slate-600 uppercase tracking-wide px-3 py-2 border-b border-slate-200">
          <span>From</span><span>To</span><span>Time</span><span>Note</span>
        </div>
        {}
        {slots.map((slot, i) => (
          <div key={slot._id} className={`grid grid-cols-4 items-center px-3 py-2.5 text-sm border-b border-slate-100 last:border-0 group ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
            <span className="text-slate-700 font-medium">{slot.from}</span>
            <span className="text-slate-700 font-medium">{slot.to}</span>
            <span className="font-bold text-slate-900">{slot.departureTime}</span>
            <div className="flex items-center justify-between">
              <span className={`text-xs ${noteClass(slot.note)}`}>{slot.note || '—'}</span>
              <div className="hidden group-hover:flex gap-1">
                <button onClick={() => handleEditSlot(slot)} className="p-1 rounded hover:bg-sky-50 text-slate-400 hover:text-sky-600"><Edit2 size={12} /></button>
                <button onClick={() => handleDeleteSlot(slot._id)} className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        ))}
        {}
        {bus.conductorName && (
          <div className="px-3 py-2 bg-blue-50 text-xs text-blue-700 font-medium border-t border-blue-100">
            🎫 Conductor: {bus.conductorName} · {bus.conductorPhone}
          </div>
        )}
        {}
        <div className="px-3 py-2 border-t border-slate-100">
          <button onClick={() => handleAddSlot(bus._id, groups === timetable.weekday ? 'weekday' : 'weekend')} className="text-xs text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1">
            <Plus size={12} /> Add Slot
          </button>
        </div>
      </div>
    ));
  };

  if (loading) return <div className="py-16 flex justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6" id="timetable-content">
      {}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Weekly Bus Timetable</h2>
          <p className="text-sm text-slate-500">Manage recurring slots. Students book from today's timetable.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setGuidelinesDraft(guidelines.join('\n')); setShowGuidelinesModal(true); }}>
            <FileText size={16} /> Edit Guidelines
          </Button>
          <Button onClick={handlePrint}>
            <Download size={16} /> Download PDF
          </Button>
        </div>
      </div>

      {}
      {buses.length === 0 && (
        <div className="card p-6 text-center text-slate-400">
          <Bus size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Add a bus first, then configure its timetable.</p>
        </div>
      )}

      {}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="bg-slate-800 text-white text-sm font-bold px-4 py-1.5 rounded-full">Monday to Friday</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {renderBusColumns(timetable.weekday)}
          {}
          {buses.filter(b => !timetable.weekday.find(g => g.bus._id === b._id)).map(b => (
            <div key={b._id} className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Bus size={24} className="opacity-40" />
              <p className="text-sm font-medium">Bus {b.busNumber} not in weekday timetable</p>
              <button onClick={() => handleAddSlot(b._id, 'weekday')} className="text-xs text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1">
                <Plus size={12} /> Add First Slot
              </button>
            </div>
          ))}
        </div>
      </div>

      {}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="bg-amber-600 text-white text-sm font-bold px-4 py-1.5 rounded-full">Saturday & Sunday</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {renderBusColumns(timetable.weekend)}
          {buses.filter(b => !timetable.weekend.find(g => g.bus._id === b._id)).map(b => (
            <div key={b._id} className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Bus size={24} className="opacity-40" />
              <p className="text-sm font-medium">Bus {b.busNumber} not in weekend timetable</p>
              <button onClick={() => handleAddSlot(b._id, 'weekend')} className="text-xs text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1">
                <Plus size={12} /> Add First Slot
              </button>
            </div>
          ))}
        </div>
      </div>

      {}
      {guidelines.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><FileText size={16} /> Guidelines for Bus Services</h3>
          <ol className="space-y-1.5 list-decimal list-inside">
            {guidelines.map((g, i) => <li key={i} className="text-sm text-slate-700">{g}</li>)}
          </ol>
        </div>
      )}

      {}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #timetable-printview, #timetable-printview * { visibility: visible; }
          #timetable-printview { position: absolute; inset: 0; padding: 24px; font-family: Arial, sans-serif; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div id="timetable-printview" style={{ display: 'none' }} className="print:block">
        <PrintableTimetable timetable={timetable} guidelines={guidelines} />
      </div>

      {}
      {showSlotModal && slotForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowSlotModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-slate-900">{slotForm._id ? 'Edit Slot' : 'Add Slot'}</h2>
              <button onClick={() => setShowSlotModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleSlotSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="text-sm font-semibold">Bus</label>
                <select required value={slotForm.busId} onChange={e => setSlotForm({ ...slotForm, busId: e.target.value })} className="form-input mt-1">
                  {buses.map(b => <option key={b._id} value={b._id}>Bus {b.busNumber}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold">Day Type</label>
                <select value={slotForm.dayType} onChange={e => setSlotForm({ ...slotForm, dayType: e.target.value })} className="form-input mt-1">
                  <option value="weekday">Weekday (Mon–Fri)</option>
                  <option value="weekend">Weekend (Sat & Sun)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold">From</label>
                  <input required value={slotForm.from} onChange={e => setSlotForm({ ...slotForm, from: e.target.value })} className="form-input mt-1" placeholder="e.g. Campus" />
                </div>
                <div>
                  <label className="text-sm font-semibold">To</label>
                  <input required value={slotForm.to} onChange={e => setSlotForm({ ...slotForm, to: e.target.value })} className="form-input mt-1" placeholder="e.g. Sadar" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold">Departure Time</label>
                  <input required value={slotForm.departureTime} onChange={e => setSlotForm({ ...slotForm, departureTime: e.target.value })} className="form-input mt-1" placeholder="e.g. 03:30 PM" />
                </div>
                <div>
                  <label className="text-sm font-semibold">Note <span className="text-slate-400 font-normal text-xs">optional</span></label>
                  <select value={slotForm.note} onChange={e => setSlotForm({ ...slotForm, note: e.target.value })} className="form-input mt-1">
                    <option value="">—</option>
                    <option value="Tentative">Tentative</option>
                    <option value="Last Bus">Last Bus</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" type="button" onClick={() => setShowSlotModal(false)}>Cancel</Button>
                <Button className="flex-1" type="submit">Save Slot</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {showGuidelinesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowGuidelinesModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-slate-900">Edit Guidelines</h2>
              <button onClick={() => setShowGuidelinesModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-slate-500">One guideline per line. These appear in the downloadable timetable.</p>
              <textarea
                rows={10}
                value={guidelinesDraft}
                onChange={e => setGuidelinesDraft(e.target.value)}
                className="form-input w-full font-mono text-sm"
                placeholder="Everyone should behave properly with the bus driver...&#10;Students are advised to take tickets prior to their journey..."
              />
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setShowGuidelinesModal(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleSaveGuidelines}>Save Guidelines</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function PrintableTimetable({ timetable, guidelines }) {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const renderSection = (groups, label) => {
    groups = sortGroupsByTime(groups);
    return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, padding: '6px 0', borderTop: '2px solid #000', borderBottom: '2px solid #000', marginBottom: 8 }}>
        ({label})
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {groups.map(({ bus }) => (
              <th key={bus._id} colSpan={4} style={{ border: '1px solid #000', padding: '6px 8px', backgroundColor: '#1e293b', color: '#fff', textAlign: 'center' }}>
                Bus No. {bus.busNumber} ({bus.registrationNumber})
              </th>
            ))}
          </tr>
          <tr>
            {groups.map(({ bus }) => (
              <React.Fragment key={bus._id}>
                <th key={`${bus._id}-f`} style={{ border: '1px solid #000', padding: '4px 6px', backgroundColor: '#f1f5f9' }}>From</th>
                <th key={`${bus._id}-t`} style={{ border: '1px solid #000', padding: '4px 6px', backgroundColor: '#f1f5f9' }}>To</th>
                <th key={`${bus._id}-tm`} style={{ border: '1px solid #000', padding: '4px 6px', backgroundColor: '#f1f5f9' }}>Out Time</th>
                <th key={`${bus._id}-n`} style={{ border: '1px solid #000', padding: '4px 6px', backgroundColor: '#f1f5f9' }}>Purpose</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.max(...groups.map(g => g.slots.length)) }).map((_, rowIdx) => (
            <tr key={rowIdx} style={{ backgroundColor: rowIdx % 2 === 0 ? '#fff' : '#f8fafc' }}>
              {groups.map(({ bus, slots }) => {
                const slot = slots[rowIdx];
                const isLast = slot?.note?.toLowerCase().includes('last');
                const style = { border: '1px solid #ccc', padding: '4px 6px', backgroundColor: isLast ? '#fef08a' : undefined, fontWeight: isLast ? 'bold' : undefined };
                return slot ? (
                  <React.Fragment key={bus._id}>
                    <td key={`${bus._id}-f`} style={style}>{slot.from}</td>
                    <td key={`${bus._id}-t`} style={style}>{slot.to}</td>
                    <td key={`${bus._id}-tm`} style={{ ...style, fontWeight: 'bold' }}>{slot.departureTime}</td>
                    <td key={`${bus._id}-n`} style={{ ...style, color: slot.note === 'Tentative' ? '#dc2626' : undefined }}>{slot.note || ''}</td>
                  </React.Fragment>
                ) : (
                  <React.Fragment key={bus._id}><td key={`${bus._id}-f`} style={{ border: '1px solid #ccc', padding: '4px 6px' }}></td><td key={`${bus._id}-t`} style={{ border: '1px solid #ccc', padding: '4px 6px' }}></td><td key={`${bus._id}-tm`} style={{ border: '1px solid #ccc', padding: '4px 6px' }}></td><td key={`${bus._id}-n`} style={{ border: '1px solid #ccc', padding: '4px 6px' }}></td></React.Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {}
      {groups.map(({ bus }) => bus.conductorName && (
        <p key={bus._id} style={{ fontSize: 11, color: '#1d4ed8', marginTop: 4 }}>Bus Conductor: {bus.conductorPhone} ({bus.conductorName})</p>
      ))}
    </div>
    );
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', fontSize: 22, fontWeight: 'bold', textDecoration: 'underline', marginBottom: 4 }}>
        Campus Hub Bus Time Table
      </h1>
      <p style={{ textAlign: 'right', fontSize: 11, marginBottom: 16 }}>Date: {today}</p>

      {timetable.weekday?.length > 0 && renderSection(timetable.weekday, 'Monday to Friday')}
      {timetable.weekend?.length > 0 && renderSection(timetable.weekend, 'Saturday & Sunday')}

      {guidelines.length > 0 && (
        <div style={{ marginTop: 16, borderTop: '1px solid #000', paddingTop: 12 }}>
          <p style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>Guidelines for Bus Services:</p>
          <ol style={{ paddingLeft: 20, fontSize: 11 }}>
            {guidelines.map((g, i) => <li key={i} style={{ marginBottom: 4 }}>{g}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}


function BookingsTab() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const res = await getBookings(); setBookings(res.data.bookings); }
      catch { toast.error("Failed to load bookings"); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="py-12 flex justify-center"><Spinner size="lg" /></div>;
  if (bookings.length === 0) return <div className="py-12 text-center text-slate-400"><p className="text-sm">No bookings yet.</p></div>;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wide">
          <tr>
            {['Student', 'Route', 'Date', 'Time', 'Seat', 'Fare', 'Status'].map(h => (
              <th key={h} className="px-4 py-3 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {bookings.map(b => (
            <tr key={b._id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-900">{b.studentId?.name}</p>
                <p className="text-xs text-slate-400">{b.studentId?.email}</p>
              </td>
              <td className="px-4 py-3 text-slate-700">{b.scheduleId?.departureLocation} → {b.scheduleId?.destination}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{new Date(b.scheduleId?.date).toLocaleDateString()}</td>
              <td className="px-4 py-3 font-semibold text-slate-800">{b.scheduleId?.departureTime}</td>
              <td className="px-4 py-3 text-center font-black text-slate-900">{b.seatNumber}</td>
              <td className="px-4 py-3 font-semibold text-emerald-700">{fmtINR(b.fare)}</td>
              <td className="px-4 py-3">
                <Badge variant={b.bookingStatus === 'Booked' ? 'success' : 'secondary'}>{b.bookingStatus}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


export default function TransportAdminPage() {
  const [tab, setTab] = useState('timetable');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const res = await getAnalytics(); setAnalytics(res.data); }
      catch { }
      finally { setAnalyticsLoading(false); }
    })();
  }, []);

  const TABS = [
    { key: 'timetable', label: 'Timetable' },
    { key: 'buses', label: 'Buses' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'analytics', label: 'Analytics' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
          <Bus size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transport Management</h1>
          <p className="text-sm text-slate-500">Manage the weekly bus timetable and bookings</p>
        </div>
      </div>

      {}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {}
      {tab === 'timetable' && <TimetableTab />}
      {tab === 'buses' && <BusesTab />}
      {tab === 'bookings' && <BookingsTab />}
      {tab === 'analytics' && <AnalyticsTab loading={analyticsLoading} analytics={analytics} />}
    </div>
  );
}
