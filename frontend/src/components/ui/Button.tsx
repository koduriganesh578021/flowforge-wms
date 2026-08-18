import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'prefix'> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'tiny' | 'small' | 'medium' | 'large';
  shape?: 'square' | 'circle' | 'rounded';
  svgOnly?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function Button({ 
  type = 'button',
  variant = 'primary', 
  size = 'medium',
  shape = 'square',
  svgOnly = false,
  prefix,
  suffix,
  loading = false,
  fullWidth = false,
  children, 
  className,
  disabled,
  ...props 
}: ButtonProps) {
  const variantStyles = {
    primary: 'bg-[#f9b17a] hover:bg-[#fa9d58] text-[#16192b] font-bold shadow-lg shadow-[#f9b17a]/20 border border-[#f9b17a]/40 active:scale-[0.98]',
    secondary: 'bg-[#2d3250] text-white hover:bg-[#424769] border border-[#676f9d]/40 active:scale-[0.98]',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 border border-rose-500/40 active:scale-[0.98]',
  };
  const sizeStyles = {
    tiny: svgOnly ? 'h-6 w-6 text-xs' : 'h-7 px-2 text-xs',
    small: svgOnly ? 'h-8 w-8 text-xs' : 'h-8 px-3 text-xs',
    medium: svgOnly ? 'h-10 w-10 text-sm' : 'h-10 px-4 text-sm',
    large: svgOnly ? 'h-12 w-12 text-base' : 'h-12 px-5 text-base',
  }[size];
  const shapeStyles = { square: 'rounded-xl', circle: 'rounded-full', rounded: 'rounded-full' }[shape];
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      aria-busy={loading ? 'true' : undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-heading transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f9b17a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141727] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        variantStyles[variant],
        sizeStyles,
        shapeStyles,
        fullWidth && 'w-full',
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
          <span className="sr-only">Processing...</span>
        </>
      ) : (
        prefix
      )}
      {!svgOnly && <span className="truncate">{children}</span>}
      {svgOnly && !loading && children}
      {!loading && suffix}
    </button>
  );
}

