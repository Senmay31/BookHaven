'use client';
import { forwardRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, error, hint, leftIcon, rightIcon, className, id, ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium font-sans text-slate-700 mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-lg border bg-white font-sans text-slate-800 placeholder:text-slate-400',
            'px-3 py-2.5 text-sm transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-0 focus:border-teal-600',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-slate-300 hover:border-slate-400',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600 font-sans">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500 font-sans">{hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
