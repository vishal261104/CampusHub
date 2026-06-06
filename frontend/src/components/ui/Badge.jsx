export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-white border border-slate-200 text-slate-600 shadow-sm',
    primary: 'bg-primary-50 border border-primary-100 text-primary-700',
    success: 'bg-emerald-50 border border-emerald-100 text-emerald-700',
    warning: 'bg-amber-50 border border-amber-100 text-amber-700',
    danger: 'bg-rose-50 border border-rose-100 text-rose-700',
    info: 'bg-sky-50 border border-sky-100 text-sky-700',
  };
  return <span className={`badge ${variants[variant]} ${className}`}>{children}</span>;
}
