import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './Badge';
import type { AllocationResponse } from '../types';

interface DecisionCardProps {
  allocation: AllocationResponse;
}

export function DecisionCard({ allocation }: DecisionCardProps) {
  // Compute totals from order lines
  const totalRequested = allocation.order.lines.reduce((sum, line) => sum + line.quantity_requested, 0);
  const totalAllocated = allocation.order.lines.reduce((sum, line) => sum + line.quantity_allocated_after, 0);
  const totalUnfulfilled = allocation.order.lines.reduce((sum, line) => sum + line.quantity_unfulfilled, 0);

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Allocation Decision</CardTitle>
          <Badge variant="success">Completed</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Priority Information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-600">Priority Score:</span>
            <span className="font-mono text-sm font-bold">{allocation.priority.score}/100</span>
            <Badge variant={allocation.priority.score >= 80 ? 'critical' : allocation.priority.score >= 60 ? 'warning' : 'neutral'}>
              {allocation.priority.label}
            </Badge>
          </div>
          
          <div className="pl-4 border-l-2 border-zinc-200">
            <p className="text-xs font-medium text-zinc-600 mb-1">Why this priority?</p>
            <ul className="text-xs text-zinc-700 space-y-1">
              {allocation.priority.reasons.map((reason, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-zinc-400">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Allocation Status */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-zinc-600 mb-1">Requested</p>
              <p className="font-mono text-lg font-semibold">{totalRequested}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 mb-1">Allocated</p>
              <p className="font-mono text-lg font-semibold text-emerald-600">{totalAllocated}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 mb-1">Unfulfilled</p>
              <p className="font-mono text-lg font-semibold text-red-600">{totalUnfulfilled}</p>
            </div>
          </div>
        </div>

        {/* Order Lines Detail */}
        <div className="border-t pt-4">
          <p className="text-xs font-medium text-zinc-600 mb-2">Allocation by SKU</p>
          <div className="space-y-2">
            {allocation.order.lines.map((line, index) => (
              <div key={index} className="flex items-center justify-between text-sm bg-zinc-50 p-2 rounded border border-zinc-200">
                <span className="font-mono">SKU {line.sku_id}</span>
                <div className="flex gap-4">
                  <span className="text-zinc-600">Req: {line.quantity_requested}</span>
                  <span className="text-emerald-600">Alloc: {line.quantity_allocated_after}</span>
                  <span className="text-red-600">Unfulfilled: {line.quantity_unfulfilled}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-600">Allocation Status:</span>
          <Badge variant={totalUnfulfilled === 0 ? 'success' : 'warning'}>
            {totalUnfulfilled === 0 ? 'Fully Allocated' : 'Partially Allocated'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
