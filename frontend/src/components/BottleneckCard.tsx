import { Badge } from './Badge';
import { Card, CardContent } from './ui/Card';
import type { Bottleneck } from '../types';

interface BottleneckCardProps {
  bottleneck: Bottleneck;
}

export function BottleneckCard({ bottleneck }: BottleneckCardProps) {
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'border-l-rose-500 bg-rose-950/20 shadow-rose-500/5';
      case 'MEDIUM':
        return 'border-l-amber-500 bg-amber-950/20 shadow-amber-500/5';
      case 'LOW':
        return 'border-l-emerald-500 bg-emerald-950/20 shadow-emerald-500/5';
      default:
        return 'border-l-[#676f9d] bg-[#2d3250]/40';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <Badge variant="critical">High Severity</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">Medium Severity</Badge>;
      case 'LOW':
        return <Badge variant="success">Low Severity</Badge>;
      default:
        return <Badge variant="neutral">Severity: {severity}</Badge>;
    }
  };

  return (
    <Card className={`border-l-4 glass-card ${getSeverityStyle(bottleneck.severity)}`}>
      <CardContent className="p-6">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-heading capitalize tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#f9b17a] animate-ping" aria-hidden="true" />
              {bottleneck.stage} Bottleneck
            </h3>
            {getSeverityBadge(bottleneck.severity)}
          </div>

          {/* Queue Info */}
          <div className="text-sm text-[#d1d5db]">
            <span className="font-mono font-bold text-white text-base">{bottleneck.queue_size}</span> orders queued · avg wait{' '}
            <span className="font-mono font-bold text-[#f9b17a]">{bottleneck.average_wait_minutes}</span> min
          </div>

          {/* Capacity Info (if available) */}
          {bottleneck.capacity_orders_per_hour && bottleneck.incoming_rate_orders_per_hour && (
            <div className="text-xs text-[#d1d5db] font-mono bg-[#16192b] p-2.5 rounded-xl border border-[#424769]/60">
              Capacity: <span className="text-[#f9b17a] font-semibold">{bottleneck.capacity_orders_per_hour}</span>/hr · Incoming:{' '}
              <span className="text-white font-semibold">{bottleneck.incoming_rate_orders_per_hour}</span>/hr
            </div>
          )}

          {/* Recommendation */}
          <div className="pt-3 border-t border-[#424769]/50">
            <p className="text-[11px] font-bold text-[#9ba3c9] uppercase tracking-wider mb-1">Recommended Action</p>
            <p className="text-xs text-white leading-relaxed font-medium">{bottleneck.recommendation}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}