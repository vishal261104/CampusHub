import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, BookOpen, Search } from 'lucide-react';
import { getCatalog, createCourse, updateCourse, deleteCourse } from '../../api/courses';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const emptyForm = { courseCode: '', courseTitle: '', credits: '', department: '', description: '' };

export default function CoursesAdminPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchCourses = async (p = 1, q = '', d = '') => {
    setLoading(true);
    try {
      const res = await getCatalog({ page: p, limit, search: q, department: d });
      setCourses(res.data.courses || []);
      setTotal(res.data.count || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchCourses(page, search, department);
  }, [page, search, department]);

  const validate = () => {
    const e = {};
    if (!form.courseCode.trim()) e.courseCode = 'Required';
    if (!form.courseTitle.trim()) e.courseTitle = 'Required';
    if (!form.credits || isNaN(form.credits) || Number(form.credits) < 0) e.credits = 'Valid credits required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (modal === 'edit' && form._id) {
        await updateCourse(form._id, form);
        toast.success('Course updated');
      } else {
        await createCourse(form);
        toast.success('Course created');
      }
      setModal(null);
      fetchCourses(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCourse(deleteTarget._id);
      toast.success('Course deleted');
      setDeleteTarget(null);
      if (courses.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchCourses(page);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally { setDeleting(false); }
  };

  const filtered = courses;

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleDepartmentChange = (e) => {
    setDepartment(e.target.value);
    setPage(1);
  };

  const columns = [
    { key: 'courseCode', label: 'Code', render: (r) => <span className="font-semibold text-slate-800">{r.courseCode}</span> },
    { key: 'courseTitle', label: 'Title' },
    { key: 'department', label: 'Department', render: (r) => r.department ? <Badge variant="primary">{r.department}</Badge> : <span className="text-slate-300">—</span> },
    { key: 'credits', label: 'Credits', render: (r) => <Badge variant="default">{r.credits} cr</Badge> },
    {
      key: 'actions', label: '', render: (r) => (
        <div className="flex gap-1.5 justify-end">
          <button onClick={() => { setForm({ ...r, credits: String(r.credits) }); setErrors({}); setModal('edit'); }} className="p-1.5 rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const F = ({ name, label, ...props }) => (
    <Input label={label} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} error={errors[name]} {...props} />
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manage Courses</h2>
          <p className="text-slate-500 text-sm">{total} total courses</p>
        </div>
        <div className="flex gap-3">
          <select
            value={department}
            onChange={handleDepartmentChange}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white transition-all"
          >
            <option value="">All Departments</option>
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="Mechanical">Mechanical</option>
            <option value="Humanities">Humanities</option>
          </select>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Search..." value={search} onChange={handleSearchChange} className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white w-52 transition-all" />
          </div>
          <Button onClick={() => { setForm(emptyForm); setErrors({}); setModal('create'); }}>
            <Plus size={16} /> Add Course
          </Button>
        </div>
      </div>

      <div className="card">
        <Table columns={columns} data={filtered} loading={loading} emptyMessage="No courses found." />
      </div>

      {!loading && total > limit && (
        <div className="flex justify-center gap-2 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-4 py-2 disabled:opacity-40">Previous</button>
          <span className="flex items-center text-sm text-slate-500">Page {page} of {Math.ceil(total / limit)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / limit)} className="btn-secondary text-sm px-4 py-2 disabled:opacity-40">Next</button>
        </div>
      )}

      {}
      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'edit' ? 'Edit Course' : 'Add New Course'}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button loading={saving} onClick={handleSave}>{modal === 'edit' ? 'Save Changes' : 'Create Course'}</Button></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <F name="courseCode" label="Course Code" placeholder="CS101" />
            <F name="credits" label="Credits" placeholder="3" type="number" min="0" />
          </div>
          <F name="courseTitle" label="Course Title" placeholder="Introduction to Computer Science" />
          <F name="department" label="Department" placeholder="Computer Science" />
          <div>
            <label className="form-label">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Course description..."
              className="form-input resize-none"
            />
          </div>
        </div>
      </Modal>

      {}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Course"
        size="sm"
        footer={<><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" loading={deleting} onClick={handleDelete}>Delete</Button></>}
      >
        <p className="text-sm text-slate-600">Are you sure you want to delete <span className="font-semibold">{deleteTarget?.courseCode}</span>? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
