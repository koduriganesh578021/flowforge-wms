import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import type { Bottleneck } from '../../types';

interface QueueSizeBarChartProps {
  bottlenecks?: Bottleneck[];
  isLoading?: boolean;
}

export function QueueSizeBarChart({ bottlenecks = [], isLoading = false }: QueueSizeBarChartProps) {
  const data = bottlenecks.map(item => ({
    stage: item.stage,
    queueSize: item.queue_size,
    wait: item.average_wait_minutes,
  }));
  const maxValue = Math.max(...data.map(item => item.queueSize), 1);
  const colors = ['#f87171', '#60a5fa', '#4ade80', '#fbbf24', '#a78bfa', '#fb923c'];

  return (
    <Card className="border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <CardHeader>
        <CardTitle className="border-b-[3px] border-black pb-2 text-xl font-black uppercase tracking-tight">Queue Size by Stage</CardTitle>
        <p className="text-sm font-medium text-zinc-500">Current orders waiting in each operational stage.</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-sm text-zinc-500">Loading queue metrics…</div>
        ) : data.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-6 text-center text-sm text-zinc-500">
            No active queue metrics are available yet.
          </div>
        ) : (
          <div className="flex h-56 w-full items-end gap-3 overflow-x-auto border-b-[3px] border-black px-2 pt-4 sm:gap-5" aria-label="Queue size by warehouse stage">
            {data.map((item, index) => {
              const height = `${Math.max(12, (item.queueSize / maxValue) * 100)}%`;
              return <div key={item.stage} className="group flex h-full min-w-[64px] flex-1 flex-col items-center justify-end">
                <div className="relative flex w-full flex-1 items-end justify-center">
                  <div title={`${item.stage}: ${item.queueSize} orders`} className="relative flex w-3/4 max-w-[120px] items-center justify-center border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 group-hover:-translate-y-1" style={{ height, backgroundColor: colors[index % colors.length], backgroundImage: 'radial-gradient(rgba(0,0,0,.28) 1px, transparent 1px)', backgroundSize: '6px 6px' }}>
                    <span className="relative z-10 text-center text-xs font-black uppercase text-black">{item.stage}</span>
                    <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap border-2 border-black bg-white px-2 py-1 text-xs font-black opacity-0 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-opacity group-hover:opacity-100">{item.queueSize} orders</span>
                  </div>
                </div>
                <span className="mt-2 font-mono text-sm font-black text-zinc-900">{item.queueSize}</span>
                <span className="max-w-full truncate text-center text-[10px] font-bold uppercase text-zinc-500" title={`${item.stage} · ${item.wait.toFixed(1)} min average wait`}>{item.wait.toFixed(0)}m wait</span>
              </div>;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
