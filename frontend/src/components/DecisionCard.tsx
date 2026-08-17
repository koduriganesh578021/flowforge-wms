import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './Badge';
import type { AllocationResponse, PriorityExplanation } from '../types';
import { formatNumber, formatPriorityScore, toNumber } from '../lib/utils';

interface DecisionCardProps {
  allocation: AllocationResponse;
  priority: PriorityExplanation | null;
}

function allocationStatus(requested: number, allocated: number): string {
  if (requested <= 0) return 'Not Required';
  if (allocated <= 0) return 'Backordered';
  if (allocated < requested) return 'Partially Allocated';
  return 'Allocated';
}

function allocationVariant(status: string): 'success' | 'warning' | 'neutral' | 'critical' {
  if (status === 'Allocated') return 'success';
  if (status === 'Backordered') return 'critical';
  return status === 'Partially Allocated' ? 'warning' : 'neutral';
}

export function DecisionCard({ allocation, priority }: DecisionCardProps) {
  const lines = allocation.order.lines;
  const totalRequested = lines.reduce((sum, line) => sum + toNumber(line.quantity_requested), 0);
  const totalAllocated = lines.reduce((sum, line) => sum + toNumber(line.quantity_allocated_after), 0);
  const totalUnfulfilled = lines.reduce((sum, line) => sum + toNumber(line.quantity_unfulfilled), 0);
  const status = allocationStatus(totalRequested, totalAllocated);
  const priorityScore = priority?.score;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Allocation Decision</CardTitle>
          <Badge variant="success">Completed</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-600">Priority Score:</span>
            <span className="font-mono text-sm font-bold">{formatPriorityScore(priorityScore)}</span>
            {priority ? (
              <Badge variant={priority.score >= 80 ? 'critical' : priority.score >= 60 ? 'warning' : 'neutral'}>
                {priority.label}
              </Badge>
            ) : (
              <Badge variant="neutral">Priority pending</Badge>
            )}
          </div>
          {priority?.reasons.length ? (
            <div className="pl-4 border-l-2 border-zinc-200">
              <p className="text-xs font-medium text-zinc-600 mb-1">Why this priority?</p>
              <ul className="text-xs text-zinc-700 space-y-1">
                {priority.reasons.map((reason, index) => <li key={index}>{reason}</li>)}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="border-t pt-4 grid grid-cols-3 gap-4 text-center">
          <div><p className="text-xs text-zinc-600 mb-1">Requested</p><p className="font-mono text-lg font-semibold">{formatNumber(totalRequested, 0)}</p></div>
          <div><p className="text-xs text-zinc-600 mb-1">Allocated</p><p className="font-mono text-lg font-semibold text-emerald-600">{formatNumber(totalAllocated, 0)}</p></div>
          <div><p className="text-xs text-zinc-600 mb-1">Unfulfilled</p><p className="font-mono text-lg font-semibold text-red-600">{formatNumber(totalUnfulfilled, 0)}</p></div>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs font-medium text-zinc-600 mb-2">{allocation.order.explanation}</p>
          <div className="space-y-2">
            {lines.map((line) => (
              <div key={line.order_item_id} className="text-sm bg-zinc-50 p-2 rounded border border-zinc-200">
                <div className="flex items-center justify-between">
                  <span className="font-mono">SKU {line.sku_id}</span>
                  <Badge variant={allocationVariant(line.line_status)}>{line.line_status}</Badge>
                </div>
                <p className="text-zinc-600 mt-1">Req: {formatNumber(line.quantity_requested, 0)} · Alloc: {formatNumber(line.quantity_allocated_after, 0)} · Unfulfilled: {formatNumber(line.quantity_unfulfilled, 0)}</p>
                <p className="text-xs text-zinc-600 mt-1">{line.explanation}</p>
                {line.source_bins.length > 0 ? <p className="text-xs text-zinc-600 mt-1">Source bins: {line.source_bins.map((bin) => `${bin.location_code} (${bin.quantity_taken})`).join(', ')}</p> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-600">Allocation Status:</span>
          <Badge variant={allocationVariant(status)}>{status}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
