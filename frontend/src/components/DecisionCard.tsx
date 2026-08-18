import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './Badge';
import type { AllocationResponse, PriorityExplanation } from '../types';
import { formatNumber, formatPriorityScore, toNumber } from '../lib/utils';
import { Sparkles, CheckCircle2 } from 'lucide-react';

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
    <Card className="glass-card border-l-4 border-l-[#f9b17a] shadow-xl">
      <CardHeader className="pb-3 border-b border-[#424769]/80">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2 font-heading">
            <Sparkles className="w-4 h-4 text-[#f9b17a]" aria-hidden="true" />
            Allocation Decision Engine
          </CardTitle>
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
            <span>Allocation Completed</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Priority Score & Reasons */}
        <div className="space-y-2.5 bg-[#16192b] p-3.5 rounded-xl border border-[#424769]/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9ba3c9]">Priority Score</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-extrabold text-white">{formatPriorityScore(priorityScore)}</span>
              {priority ? (
                <Badge variant={priority.score >= 80 ? 'critical' : priority.score >= 60 ? 'warning' : 'neutral'}>
                  Priority: {priority.label}
                </Badge>
              ) : (
                <Badge variant="neutral">Priority: Pending</Badge>
              )}
            </div>
          </div>

          {priority?.reasons.length ? (
            <div className="pt-2 border-t border-[#424769]/60 space-y-1">
              <p className="text-[11px] font-semibold text-[#9ba3c9] uppercase tracking-wider">Priority Rationale</p>
              <ul className="text-xs text-[#d1d5db] space-y-1 list-disc list-inside font-medium">
                {priority.reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Quantities Overview Grid */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-[#16192b]/60 rounded-xl border border-[#424769]/60 text-center">
          <div>
            <p className="text-[11px] font-semibold uppercase text-[#9ba3c9]">Requested</p>
            <p className="font-mono text-lg font-bold text-white mt-1">{formatNumber(totalRequested, 0)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-[#9ba3c9]">Allocated</p>
            <p className="font-mono text-lg font-bold text-emerald-400 mt-1">{formatNumber(totalAllocated, 0)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-[#9ba3c9]">Unfulfilled</p>
            <p className="font-mono text-lg font-bold text-rose-400 mt-1">{formatNumber(totalUnfulfilled, 0)}</p>
          </div>
        </div>

        {/* SKU Allocation Breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#d1d5db]">{allocation.order.explanation}</p>
          <div className="space-y-2">
            {lines.map((line) => (
              <div key={line.order_item_id} className="text-xs bg-[#16192b] p-3 rounded-xl border border-[#424769]/60">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-white">SKU #{line.sku_id}</span>
                  <Badge variant={allocationVariant(line.line_status)}>Status: {line.line_status}</Badge>
                </div>
                <p className="text-[#d1d5db] mt-1.5 font-mono">
                  Req: <span className="text-white font-bold">{formatNumber(line.quantity_requested, 0)}</span> · Alloc:{' '}
                  <span className="text-emerald-400 font-bold">{formatNumber(line.quantity_allocated_after, 0)}</span> · Unfulfilled:{' '}
                  <span className="text-rose-400 font-bold">{formatNumber(line.quantity_unfulfilled, 0)}</span>
                </p>
                <p className="text-[#9ba3c9] mt-1">{line.explanation}</p>
                {line.source_bins.length > 0 ? (
                  <p className="text-[11px] text-[#f9b17a] font-mono mt-1.5 bg-[#f9b17a]/10 p-1.5 rounded border border-[#f9b17a]/20">
                    Source Bins: {line.source_bins.map((bin) => `${bin.location_code} (${bin.quantity_taken})`).join(', ')}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Final Status */}
        <div className="flex items-center justify-between text-sm pt-2 border-t border-[#424769]/60">
          <span className="text-xs font-semibold text-[#9ba3c9] uppercase tracking-wider">Overall Allocation:</span>
          <Badge variant={allocationVariant(status)}>Status: {status}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

