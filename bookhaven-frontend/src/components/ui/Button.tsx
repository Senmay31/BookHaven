'use client';
import { forwardRef, ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  fullWidth,
  children,
  className,
  disabled,
  ...props
}, ref) => {
  const base = 'inline-flex items-center justify-center gap-2 font-sans font-medium rounded-lg transition-all duration-200 focus-ring disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm active:scale-[0.98]',
    secondary: 'bg-parchment-100 text-slate-800 hover:bg-parchment-200 border border-parchment-300',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-teal-600 text-teal-600 hover:bg-teal-50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
