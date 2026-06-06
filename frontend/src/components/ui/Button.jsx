import Spinner from './Spinner';

export default function Button({
  children, variant = 'primary', size = 'md', loading = false, className = '', ...props
}) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 text-sm font-medium transition-all duration-150 hover:bg-slate-100',
  };
  const sizes = { sm: 'text-xs px-3 py-1.5', md: '', lg: 'text-base px-5 py-3' };
  return (
    <button
      className={`${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
}
