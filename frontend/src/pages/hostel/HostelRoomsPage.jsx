import { useState, useEffect } from 'react';
import { getAllRooms, createRoom, updateRoom, deleteRoom, getRoomOccupancy } from '../../api/hostel';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { BedDouble, Plus, Pencil, Trash2, Users, X, RefreshCw, Search } from 'lucide-react';

const ROOM_TYPES = ['Single', 'Double', 'Triple', 'Suite'];
const HOSTEL_TYPES = ['Boys', 'Girls'];
const INITIAL_FORM = { roomNumber: '', hostelType: 'Boys', hostelBlock: '', roomType: 'Single', capacity: 1, floor: 1 };

const hostelTypeStyle = {
  Boys: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100', badge: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
  Girls: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-400' },
};

export default function HostelRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ hostelType: '', hostelBlock: '', type: '', floor: '', available: '' });
  const [showModal, setShowModal] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.hostelType)  params.hostelType  = filters.hostelType;
      if (filters.hostelBlock) params.hostelBlock = filters.hostelBlock;
      if (filters.type)        params.type        = filters.type;
      if (filters.floor)       params.floor       = filters.floor;
      if (filters.available)   params.available   = filters.available;
      const res = await getAllRooms(params);
      setRooms(res.data.rooms || []);
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRooms(); }, [filters]);

  const openCreate = () => {
    setForm({ ...INITIAL_FORM, hostelType: activeTab === 'All' ? 'Boys' : activeTab });
    setEditRoom(null);
    setShowModal(true);
  };

  const openEdit = (room) => {
    setForm({
      roomNumber: room.roomNumber,
      hostelType: room.hostelType,
      hostelBlock: room.hostelBlock,
      roomType: room.roomType,
      capacity: room.capacity,
      floor: room.floor,
    });
    setEditRoom(room);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditRoom(null);
    setForm(INITIAL_FORM);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        roomNumber: form.roomNumber,
        capacity: Number(form.capacity),
        floor: Number(form.floor),
      };
      if (editRoom) {
        await updateRoom(editRoom._id, payload);
        toast.success('Room updated successfully');
      } else {
        await createRoom(payload);
        toast.success('Room created successfully');
      }
      closeModal();
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (room) => {
    if (!window.confirm(`Deactivate Room ${room.roomNumber} (${room.hostelBlock}, ${room.hostelType} Hostel)? This is a soft delete.`)) return;
    setDeleting(room._id);
    try {
      await deleteRoom(room._id);
      toast.success('Room deactivated');
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate room');
    } finally {
      setDeleting(null);
    }
  };

  const viewOccupancy = async (room) => {
    setOccupancy({ room, occupants: [], loading: true });
    try {
      const res = await getRoomOccupancy(room._id);
      setOccupancy({ ...res.data, loading: false });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load occupancy');
      setOccupancy(null);
    }
  };

  // Derive unique blocks and floors from currently visible rooms
  const uniqueBlocks = [...new Set(rooms.map(r => r.hostelBlock))].sort();
  const uniqueFloors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);

  // Tab filtering (Boys / Girls / All)
  const tabRooms = activeTab === 'All' ? rooms : rooms.filter(r => r.hostelType === activeTab);

  const displayRooms = searchTerm
    ? tabRooms.filter(r =>
        String(r.roomNumber).includes(searchTerm) ||
        r.hostelBlock.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.roomType.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : tabRooms;

  // Stats
  const statsFor = (type) => {
    const subset = type === 'All' ? rooms : rooms.filter(r => r.hostelType === type);
    return {
      total: subset.length,
      beds: subset.reduce((s, r) => s + r.capacity, 0),
      occupied: subset.reduce((s, r) => s + r.currentOccupancy, 0),
    };
  };
  const boysStats = statsFor('Boys');
  const girlsStats = statsFor('Girls');

  const tabStyle = (tab) =>
    `px-5 py-2.5 text-sm font-semibold rounded-t-lg whitespace-nowrap transition-colors ${
      activeTab === tab
        ? tab === 'Boys'
          ? 'text-sky-700 border-b-2 border-sky-500 bg-sky-50/40'
          : tab === 'Girls'
          ? 'text-rose-700 border-b-2 border-rose-400 bg-rose-50/40'
          : 'text-primary-600 border-b-2 border-primary-500'
        : 'text-slate-500 hover:text-slate-800'
    }`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
            <BedDouble size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Room Management</h1>
            <p className="text-sm text-slate-500">{rooms.length} active room{rooms.length !== 1 ? 's' : ''} across both hostels</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRooms} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors shadow-sm">
            <Plus size={14} /> Add Room
          </button>
        </div>
      </div>

      {/* Hostel summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { type: 'Boys', stats: boysStats, emoji: '🏠' },
          { type: 'Girls', stats: girlsStats, emoji: '🏡' },
        ].map(({ type, stats, emoji }) => {
          const s = hostelTypeStyle[type];
          return (
            <div key={type} className={`${s.bg} border ${s.border} rounded-2xl p-5`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{emoji}</span>
                  <span className={`font-bold text-base ${s.text}`}>{type} Hostel</span>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.badge}`}>
                  {stats.total} room{stats.total !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/60 rounded-xl px-3 py-2 text-center">
                  <p className={`text-xl font-bold ${s.text}`}>{stats.beds}</p>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Beds</p>
                </div>
                <div className="bg-white/60 rounded-xl px-3 py-2 text-center">
                  <p className={`text-xl font-bold ${s.text}`}>{stats.occupied}</p>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Occupied</p>
                </div>
                <div className="bg-white/60 rounded-xl px-3 py-2 text-center">
                  <p className={`text-xl font-bold ${s.text}`}>{stats.beds - stats.occupied}</p>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Free</p>
                </div>
              </div>
              {/* Occupancy bar */}
              <div className="mt-3">
                <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.dot}`}
                    style={{ width: stats.beds ? `${(stats.occupied / stats.beds) * 100}%` : '0%' }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {stats.beds ? Math.round((stats.occupied / stats.beds) * 100) : 0}% occupied
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tabs + filters */}
        <div className="border-b border-slate-100">
          {/* Tabs */}
          <div className="flex px-4 pt-2 gap-1 overflow-x-auto">
            {['All', 'Boys', 'Girls'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={tabStyle(tab)}>
                {tab === 'All' ? 'All Rooms' : `${tab} Hostel`}
                <span className="ml-1.5 text-xs opacity-60">
                  ({tab === 'All' ? rooms.length : rooms.filter(r => r.hostelType === tab).length})
                </span>
              </button>
            ))}
          </div>

          {/* Filters row */}
          <div className="px-4 py-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by room no., block, type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all"
              />
            </div>
            <select value={filters.hostelBlock} onChange={e => setFilters(f => ({ ...f, hostelBlock: e.target.value }))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-200">
              <option value="">All Blocks</option>
              {uniqueBlocks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-200">
              <option value="">All Types</option>
              {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filters.floor} onChange={e => setFilters(f => ({ ...f, floor: e.target.value }))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-200">
              <option value="">All Floors</option>
              {uniqueFloors.map(fl => <option key={fl} value={fl}>Floor {fl}</option>)}
            </select>
            <select value={filters.available} onChange={e => setFilters(f => ({ ...f, available: e.target.value }))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-200">
              <option value="">All Status</option>
              <option value="true">Available</option>
              <option value="false">Full</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : displayRooms.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <BedDouble size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No rooms found</p>
            <button onClick={openCreate} className="mt-4 text-sm text-primary-600 hover:underline">Add a room</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-6 py-3 font-semibold">Room</th>
                  <th className="text-left px-6 py-3 font-semibold">Hostel</th>
                  <th className="text-left px-6 py-3 font-semibold">Block</th>
                  <th className="text-left px-6 py-3 font-semibold">Type</th>
                  <th className="text-left px-6 py-3 font-semibold">Floor</th>
                  <th className="text-left px-6 py-3 font-semibold">Occupancy</th>
                  <th className="text-left px-6 py-3 font-semibold">Status</th>
                  <th className="text-right px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayRooms.map(room => {
                  const isFull = room.currentOccupancy >= room.capacity;
                  const hs = hostelTypeStyle[room.hostelType] || hostelTypeStyle.Boys;
                  return (
                    <tr key={room._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800">#{room.roomNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${hs.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${hs.dot}`} />
                          {room.hostelType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-700">{room.hostelBlock}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="default">{room.roomType}</Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-600">Floor {room.floor}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isFull ? 'bg-rose-500' : hs.dot}`}
                              style={{ width: room.capacity ? `${(room.currentOccupancy / room.capacity) * 100}%` : '0%' }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{room.currentOccupancy}/{room.capacity}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={isFull ? 'danger' : 'success'}>{isFull ? 'Full' : 'Available'}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => viewOccupancy(room)} title="View occupants" className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                            <Users size={14} />
                          </button>
                          <button onClick={() => openEdit(room)} title="Edit room" className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(room)} disabled={deleting === room._id} title="Deactivate room" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50">
                            {deleting === room._id ? <Spinner size="xs" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{editRoom ? 'Edit Room' : 'Create New Room'}</h2>
                {form.hostelType && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${hostelTypeStyle[form.hostelType]?.badge}`}>
                    {form.hostelType} Hostel
                  </span>
                )}
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {/* Hostel Type toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Hostel</label>
                <div className="grid grid-cols-2 gap-2">
                  {HOSTEL_TYPES.map(ht => {
                    const s = hostelTypeStyle[ht];
                    const isSelected = form.hostelType === ht;
                    return (
                      <button
                        key={ht}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, hostelType: ht }))}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          isSelected
                            ? `${s.bg} ${s.text} ${s.border}`
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                        {ht} Hostel
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Room Number</label>
                  <input
                    type="text" required
                    value={form.roomNumber}
                    onChange={e => setForm(f => ({ ...f, roomNumber: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all"
                    placeholder="A101"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hostel Block</label>
                  <input
                    type="text" required
                    value={form.hostelBlock}
                    onChange={e => setForm(f => ({ ...f, hostelBlock: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all"
                    placeholder="Block A"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Room Type</label>
                <select
                  value={form.roomType}
                  onChange={e => setForm(f => ({ ...f, roomType: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all bg-white"
                >
                  {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Capacity</label>
                  <input
                    type="number" required min="1"
                    value={form.capacity}
                    onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Floor</label>
                  <input
                    type="number" required min="0"
                    value={form.floor}
                    onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Spinner size="xs" />}
                  {editRoom ? 'Update Room' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Occupancy Drawer */}
      {occupancy && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setOccupancy(null)}>
          <div className="bg-white h-full w-full max-w-md shadow-2xl animate-slide-left overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Room Occupancy</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-slate-500">Room #{occupancy.room?.roomNumber} · {occupancy.room?.hostelBlock}</p>
                  {occupancy.room?.hostelType && (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${hostelTypeStyle[occupancy.room.hostelType]?.badge}`}>
                      {occupancy.room.hostelType}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setOccupancy(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-primary-700">{occupancy.currentOccupancy ?? 0}</p>
                  <p className="text-xs font-semibold text-primary-500 uppercase tracking-wider">Occupied</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-slate-700">{occupancy.capacity ?? 0}</p>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Capacity</p>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-slate-800 mb-3">Current Occupants</h3>
              {occupancy.loading ? (
                <div className="flex justify-center py-10"><Spinner size="lg" /></div>
              ) : (occupancy.occupants || []).length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No occupants in this room</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {occupancy.occupants.map((occ, i) => {
                    const student = occ.studentId;
                    return (
                      <div key={occ._id || i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary-600">
                            {student?.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{student?.name || '—'}</p>
                          <p className="text-xs text-slate-400 truncate">{student?.email || '—'}</p>
                        </div>
                        <span className="text-xs font-mono text-slate-500 shrink-0">{student?.studentId || '—'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
