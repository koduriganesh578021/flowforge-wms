import { cn } from '../lib/utils';

interface BadgeProps {
  variant: 'critical' | 'warning' | 'success' | 'neutral' | 'active';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className }: BadgeProps) {
  const variantStyles = {
    critical: 'bg-rose-950/70 text-rose-300 border-rose-500/50 shadow-xs font-bold',
    warning: 'bg-amber-950/70 text-amber-300 border-amber-500/50 shadow-xs font-bold',
    success: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50 shadow-xs font-bold',
    neutral: 'bg-[#2d3250] text-[#d1d5db] border-[#424769] font-medium',
    active: 'bg-[#f9b17a]/20 text-[#f9b17a] border-[#f9b17a]/50 shadow-xs shadow-[#f9b17a]/10 font-bold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-xs border rounded-full backdrop-blur-xs font-mono transition-colors tracking-wide',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

