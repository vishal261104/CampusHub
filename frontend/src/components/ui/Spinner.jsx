export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-10 w-10 border-[3px]' };
  return (
    <div
      className={`${sizes[size]} rounded-full border-slate-200 border-t-primary-600 animate-spin ${className}`}
    />
  );
}
