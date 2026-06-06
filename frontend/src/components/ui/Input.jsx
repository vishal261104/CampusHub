import { forwardRef } from 'react';

const Input = forwardRef(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <div className="w-full">
      {label && <label className="form-label">{label}</label>}
      <input ref={ref} className={`form-input ${error ? 'border-rose-400 ring-2 ring-rose-100' : ''} ${className}`} {...props} />
      {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
    </div>
  );
});

export default Input;
