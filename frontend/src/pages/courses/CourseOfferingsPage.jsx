import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Users, Calendar, UserCheck } from 'lucide-react';
import { listOfferings, createOffering, updateOffering, deleteOffering, assignFaculty } from '../../api/offerings';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

const SEMESTERS = ['Spring', 'Summer', 'Fall', 'Winter'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const emptyForm = {
  courseCode: '', semester: 'Fall', year: new Date().getFullYear(), facultyEmail: '',
  capacity: '', section: 'A', status: 'Open',
  enrollStarts: '', enrollEnds: '',
  meetings: [{ day: 'Monday', startTime: '09:00', endTime: '10:00', building: '', room: '' }],
};

export default function CourseOfferingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [assignEmail, setAssignEmail] = useState('');

  
  const [filterSemester, setFilterSemester] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCourseCode, setFilterCourseCode] = useState('');
  const [filterFacultyName, setFilterFacultyName] = useState('');

  const fetch = async (currentPage = page) => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit,
        ...(isAdmin ? { facultyName: filterFacultyName } : { facultyName: user?.name }),
        ...(filterSemester ? { semester: filterSemester } : {}),
        ...(filterYear ? { year: Number(filterYear) } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterCourseCode ? { courseCode: filterCourseCode } : {}),
      };
      const res = await listOfferings(params);
      setOfferings(res.data.offerings || []);
      setTotal(res.data.count || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    setPage(1);
  }, [user?.role, filterSemester, filterYear, filterStatus, filterCourseCode,   filterFacultyName]);

  useEffect(() => {
    fetch(page);
  }, [page, user?.email, user?.role, filterSemester, filterYear, filterStatus, filterCourseCode, filterFacultyName]);

  const clearFilters = () => {
    setFilterSemester('');
    setFilterYear('');
    setFilterStatus('');
    setFilterCourseCode('');
      setFilterFacultyName('');
  };

  const setFormField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const updateMeeting = (i, key, val) => {
    const ms = [...form.meetings];
    ms[i] = { ...ms[i], [key]: val };
    setFormField('meetings', ms);
  };

  const addMeeting = () => setFormField('meetings', [...form.meetings, { day: 'Monday', startTime: '09:00', endTime: '10:00', building: '', room: '' }]);
  const removeMeeting = (i) => setFormField('meetings', form.meetings.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, year: Number(form.year), capacity: Number(form.capacity) };
      if (modal === 'edit' && form._id) {
        await updateOffering(form._id, payload);
        toast.success('Offering updated');
      } else {
        await createOffering(payload);
        toast.success('Offering created');
      }
      setModal(null);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteOffering(deleteTarget._id);
      toast.success('Offering deleted');
      setDeleteTarget(null);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setDeleting(false); }
  };

  const handleAssign = async () => {
    setSaving(true);
    try {
      await assignFaculty(assignModal._id, { facultyEmail: assignEmail });
      toast.success('Faculty assigned');
      setAssignModal(null);
      setAssignEmail('');
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const openEdit = (o) => {
    setForm({
      _id: o._id,
      courseCode: o.courseId?.courseCode || '',
      semester: o.semester,
      year: o.year,
      facultyEmail: o.facultyId?.email || '',
      capacity: String(o.capacity),
      section: o.section,
      status: o.status,
      enrollStarts: o.enrollStarts ? o.enrollStarts.split('T')[0] : '',
      enrollEnds: o.enrollEnds ? o.enrollEnds.split('T')[0] : '',
      meetings: o.meetings || [],
    });
    setModal('edit');
  };

  const columns = [
    { key: 'course', label: 'Course', render: (r) => (
      <div><p className="font-semibold text-slate-800 text-sm">{r.courseId?.courseCode}</p><p className="text-xs text-slate-400 max-w-[180px] truncate">{r.courseId?.courseTitle}</p></div>
    )},
    { key: 'section', label: 'Section', render: (r) => <span className="font-medium">{r.semester} {r.year} – {r.section}</span> },
    { key: 'faculty', label: 'Faculty', render: (r) => r.facultyId?.name || <span className="text-slate-300">—</span> },
    { key: 'enrolled', label: 'Enrolled', render: (r) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, (r.enrolledCount / r.capacity) * 100)}%` }} />
        </div>
        <span className="text-xs text-slate-500">{r.enrolledCount}/{r.capacity}</span>
      </div>
    )},
    { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'Open' ? 'success' : 'danger'}>{r.status}</Badge> },
    isAdmin && { key: 'actions', label: '', render: (r) => (
      <div className="flex gap-1.5 justify-end">
        <button onClick={() => { setAssignModal(r); setAssignEmail(''); }} title="Assign Faculty" className="p-1.5 rounded-lg hover:bg-sky-50 text-slate-400 hover:text-sky-600 transition-colors"><UserCheck size={14} /></button>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-colors"><Pencil size={14} /></button>
        <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
      </div>
    )},
  ].filter(Boolean);

  const FInput = ({ name, label, ...props }) => (
    <Input label={label} value={form[name]} onChange={(e) => setFormField(name, e.target.value)} {...props} />
  );

  const hasActiveFilters = filterSemester || filterYear || filterStatus || filterCourseCode || filterFacultyName;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{isAdmin ? 'Course Offerings' : 'My Course Offerings'}</h2>
          <p className="text-slate-500 text-sm">{total} offering{total !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setForm(emptyForm); setModal('create'); }}>
            <Plus size={16} /> New Offering
          </Button>
        )}
      </div>

      {}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filters</span>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-rose-500 hover:text-rose-600 font-medium">
              Clear Filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Course Code</label>
            <input
              type="text"
              placeholder="e.g. CS101"
              value={filterCourseCode}
              onChange={(e) => setFilterCourseCode(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Semester</label>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-400 bg-white"
            >
              <option value="">All Semesters</option>
              {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Year</label>
            <input
              type="number"
              placeholder="e.g. 2026"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-400 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          {isAdmin && (
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Faculty Name</label>
              <input
                type="text"
                placeholder="faculty@uni.edu"
                value={filterFacultyName}
                onChange={(e) => setFilterFacultyName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-400"
              />
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <Table columns={columns} data={offerings} loading={loading} emptyMessage="No offerings found." />
      </div>

      {!loading && total > limit && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <Button
            variant="secondary"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / limit)}
          >
            Next
          </Button>
        </div>
      )}

      {}
      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'edit' ? 'Edit Offering' : 'New Course Offering'}
        size="lg"
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button loading={saving} onClick={handleSave}>{modal === 'edit' ? 'Save Changes' : 'Create Offering'}</Button></>}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FInput name="courseCode" label="Course Code" placeholder="CS101" />
            <FInput name="facultyEmail" label="Faculty Email" placeholder="faculty@uni.edu" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Semester</label>
              <select value={form.semester} onChange={(e) => setFormField('semester', e.target.value)} className="form-input">
                {SEMESTERS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <FInput name="year" label="Year" type="number" min="2000" max="2100" />
            <FInput name="section" label="Section" placeholder="A" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FInput name="capacity" label="Capacity" type="number" min="1" />
            <div>
              <label className="form-label">Status</label>
              <select value={form.status} onChange={(e) => setFormField('status', e.target.value)} className="form-input">
                <option>Open</option><option>Closed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FInput name="enrollStarts" label="Enrollment Starts" type="date" />
            <FInput name="enrollEnds" label="Enrollment Ends" type="date" />
          </div>

          {}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">Meeting Times</label>
              <button onClick={addMeeting} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"><Plus size={12} /> Add</button>
            </div>
            <div className="space-y-3">
              {form.meetings.map((m, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block">Day</label>
                      <select value={m.day} onChange={(e) => updateMeeting(i, 'day', e.target.value)} className="form-input text-xs py-1.5">
                        {DAYS.map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block">Start</label>
                      <input type="time" value={m.startTime} onChange={(e) => updateMeeting(i, 'startTime', e.target.value)} className="form-input text-xs py-1.5" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block">End</label>
                      <input type="time" value={m.endTime} onChange={(e) => updateMeeting(i, 'endTime', e.target.value)} className="form-input text-xs py-1.5" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Building" value={m.building} onChange={(e) => updateMeeting(i, 'building', e.target.value)} className="form-input text-xs py-1.5" />
                    <div className="flex gap-2">
                      <input placeholder="Room" value={m.room} onChange={(e) => updateMeeting(i, 'room', e.target.value)} className="form-input text-xs py-1.5 flex-1" />
                      {form.meetings.length > 1 && (
                        <button onClick={() => removeMeeting(i)} className="text-rose-400 hover:text-rose-600 flex-shrink-0"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {}
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title="Assign Faculty" size="sm"
        footer={<><Button variant="secondary" onClick={() => setAssignModal(null)}>Cancel</Button><Button loading={saving} onClick={handleAssign}>Assign</Button></>}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Assigning faculty to <span className="font-semibold text-slate-800">{assignModal?.courseId?.courseCode}</span></p>
          <Input label="Faculty Email" placeholder="faculty@university.edu" value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} />
        </div>
      </Modal>

      {}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Offering" size="sm"
        footer={<><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" loading={deleting} onClick={handleDelete}>Delete</Button></>}
      >
        <p className="text-sm text-slate-600">Delete offering for <span className="font-semibold">{deleteTarget?.courseId?.courseCode}</span> ({deleteTarget?.semester} {deleteTarget?.year})?</p>
      </Modal>
    </div>
  );
}
