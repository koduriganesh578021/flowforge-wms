import { Badge } from './Badge';
import { Card, CardContent } from './ui/Card';
import type { Bottleneck } from '../types';

interface BottleneckCardProps {
  bottleneck: Bottleneck;
}

export function BottleneckCard({ bottleneck }: BottleneckCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'border-red-200 bg-red-50';
      case 'MEDIUM':
        return 'border-amber-200 bg-amber-50';
      case 'LOW':
        return 'border-emerald-200 bg-emerald-50';
      default:
        return 'border-zinc-200 bg-zinc-50';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <Badge variant="critical">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">Medium</Badge>;
      case 'LOW':
        return <Badge variant="success">Low</Badge>;
      default:
        return <Badge variant="neutral">{severity}</Badge>;
    }
  };

  return (
    <Card className={`border-l-4 ${getSeverityColor(bottleneck.severity)}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 font-mono">
              {bottleneck.stage} bottleneck
            </h3>
            {getSeverityBadge(bottleneck.severity)}
          </div>

          {/* Queue Info */}
          <div className="text-sm text-zinc-700">
            <span className="font-mono font-medium">{bottleneck.queue_size}</span> orders waiting · average wait{' '}
            <span className="font-mono font-medium">{bottleneck.average_wait_minutes}</span> minutes
          </div>

          {/* Capacity Info (if available) */}
          {bottleneck.capacity_orders_per_hour && bottleneck.incoming_rate_orders_per_hour && (
            <div className="text-xs text-zinc-600">
              Capacity: <span className="font-mono">{bottleneck.capacity_orders_per_hour}</span> orders/hour · incoming rate:{' '}
              <span className="font-mono">{bottleneck.incoming_rate_orders_per_hour}</span> orders/hour
            </div>
          )}

          {/* Recommendation */}
          <div className="pt-2 border-t border-zinc-200">
            <p className="text-xs text-zinc-500 mb-1">Recommended action:</p>
            <p className="text-sm text-zinc-900">{bottleneck.recommendation}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}