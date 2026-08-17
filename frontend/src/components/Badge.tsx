import { cn } from '../lib/utils';

interface BadgeProps {
  variant: 'critical' | 'warning' | 'success' | 'neutral' | 'active';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className }: BadgeProps) {
  const variantStyles = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    neutral: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    active: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
