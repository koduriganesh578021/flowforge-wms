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

  // Identify highest bottleneck for accessible summary
  const highestBottleneck = [...data].sort((a, b) => b.queueSize - a.queueSize)[0];
  const summaryText = highestBottleneck
    ? `${highestBottleneck.stage} has the highest queue: ${highestBottleneck.queueSize} orders waiting, average wait ${highestBottleneck.wait.toFixed(0)} minutes.`
    : 'No active queue bottlenecks.';

  return (
    <Card className="glass-card border border-[#424769]/50 shadow-xl">
      <CardHeader className="border-b border-[#424769]/50 pb-3">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-white font-heading">
          Queue Size by Stage
        </CardTitle>
        <p className="text-xs text-[#9ba3c9] font-medium">
          Current orders waiting in each operational stage.
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-xs text-[#9ba3c9] font-mono">
            Loading queue metrics…
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-[#424769] bg-[#16192b]/50 px-6 text-center text-xs text-[#9ba3c9]">
            No active queue metrics are available yet.
          </div>
        ) : (
          <div>
            {/* Screen Reader Summary & Accessible Table */}
            <p className="sr-only" aria-live="polite">
              {summaryText}
            </p>
            <table className="sr-only">
              <caption>Queue size and average wait time by warehouse stage</caption>
              <thead>
                <tr>
                  <th scope="col">Stage</th>
                  <th scope="col">Orders Queued</th>
                  <th scope="col">Average Wait (minutes)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.stage}>
                    <td>{item.stage}</td>
                    <td>{item.queueSize}</td>
                    <td>{item.wait.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Visual Bar Chart */}
            <div
              className="flex h-56 w-full items-end gap-3 overflow-x-auto border-b border-[#424769]/60 px-2 pt-4 sm:gap-5"
              aria-hidden="true"
            >
              {data.map((item, index) => {
                const height = `${Math.max(12, (item.queueSize / maxValue) * 100)}%`;
                return (
                  <div key={item.stage} className="group flex h-full min-w-[64px] flex-1 flex-col items-center justify-end">
                    <div className="relative flex w-full flex-1 items-end justify-center">
                      <div
                        title={`${item.stage}: ${item.queueSize} orders (${item.wait.toFixed(0)}m avg wait)`}
                        className="relative flex w-3/4 max-w-[120px] items-center justify-center rounded-t-lg border border-[#424769] shadow-lg transition-transform duration-150 group-hover:-translate-y-1"
                        style={{
                          height,
                          backgroundColor: colors[index % colors.length],
                          backgroundImage: 'radial-gradient(rgba(0,0,0,.35) 1px, transparent 1px)',
                          backgroundSize: '6px 6px',
                        }}
                      >
                        <span className="relative z-10 text-center text-xs font-extrabold uppercase text-[#16192b] drop-shadow-xs">
                          {item.stage}
                        </span>
                        <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#424769] bg-[#16192b] px-2 py-1 text-xs font-mono font-bold text-white shadow-xl opacity-0 transition-opacity group-hover:opacity-100">
                          {item.queueSize} orders
                        </span>
                      </div>
                    </div>
                    <span className="mt-2 font-mono text-sm font-bold text-white">{item.queueSize}</span>
                    <span className="max-w-full truncate text-center text-[10px] font-bold uppercase text-[#9ba3c9]">
                      {item.wait.toFixed(0)}m wait
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

