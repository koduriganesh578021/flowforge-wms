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
  children: React.ReactNode;
  className?: string;
}

export function Button({ 
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
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300 focus:ring-zinc-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  const sizeStyles = {
    tiny: svgOnly ? 'h-6 w-6 text-xs' : 'h-6 px-1.5 text-xs',
    small: svgOnly ? 'h-8 w-8 text-sm' : 'h-8 px-2 text-sm',
    medium: svgOnly ? 'h-10 w-10 text-sm' : 'h-10 px-3 text-sm',
    large: svgOnly ? 'h-12 w-12 text-base' : 'h-12 px-3.5 text-base',
  }[size];
  const shapeStyles = { square: 'rounded-md', circle: 'rounded-full', rounded: 'rounded-full' }[shape];
  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles,
        shapeStyles,
        fullWidth && 'w-full',
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Loading" /> : prefix}
      {!svgOnly && <span className="truncate px-1.5">{children}</span>}
      {svgOnly && !loading && children}
      {!loading && suffix}
    </button>
  );
}
