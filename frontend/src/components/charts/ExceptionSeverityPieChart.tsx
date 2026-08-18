import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import type { ExceptionAlert } from '../../types';

const COLORS: Record<string, string> = { HIGH: '#f87171', MEDIUM: '#fbbf24', LOW: '#4ade80' };

export function ExceptionSeverityPieChart({ exceptions }: { exceptions: ExceptionAlert[] }) {
  const data = ['HIGH', 'MEDIUM', 'LOW']
    .map(level => ({ name: level, value: exceptions.filter(item => item.severity === level).length }))
    .filter(item => item.value > 0);

  const totalExceptions = exceptions.length;
  const summaryText = totalExceptions > 0
    ? `Total of ${totalExceptions} active exceptions: ${data.map(d => `${d.value} ${d.name}`).join(', ')}.`
    : 'No active exceptions requiring attention.';

  return (
    <Card className="glass-card border border-[#424769]/50 shadow-xl">
      <CardHeader className="border-b border-[#424769]/50 pb-3">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-white font-heading">
          Exception Severity
        </CardTitle>
        <p className="text-xs text-[#9ba3c9] font-medium">
          Open alerts requiring operator attention.
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        {data.length === 0 ? (
          <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-[#424769] text-xs text-[#9ba3c9]">
            ✓ No open exceptions requiring attention.
          </div>
        ) : (
          <div>
            {/* Screen Reader Summary & Accessible Table */}
            <p className="sr-only" aria-live="polite">
              {summaryText}
            </p>
            <table className="sr-only">
              <caption>Active warehouse exceptions by severity level</caption>
              <thead>
                <tr>
                  <th scope="col">Severity Level</th>
                  <th scope="col">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Visual Pie Chart */}
            <div className="grid h-72 grid-cols-2 items-center gap-4" aria-hidden="true">
              <div className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={92}
                      paddingAngle={3}
                      stroke="#16192b"
                      strokeWidth={2}
                    >
                      {data.map(item => (
                        <Cell key={item.name} fill={COLORS[item.name]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#16192b', borderColor: '#424769', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {data.map(item => (
                  <div key={item.name} className="flex items-center justify-between p-2.5 rounded-xl bg-[#16192b] border border-[#424769]/60">
                    <span className="flex items-center gap-2 text-xs font-bold text-white">
                      <span className="h-3 w-3 rounded-full border border-[#424769]" style={{ backgroundColor: COLORS[item.name] }} />
                      {item.name}
                    </span>
                    <span className="font-mono font-bold text-white text-sm">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

