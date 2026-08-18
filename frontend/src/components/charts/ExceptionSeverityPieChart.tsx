import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import type { ExceptionAlert } from '../../types';

const COLORS: Record<string, string> = { HIGH: '#f87171', MEDIUM: '#fbbf24', LOW: '#4ade80' };

export function ExceptionSeverityPieChart({ exceptions }: { exceptions: ExceptionAlert[] }) {
  const data = ['HIGH', 'MEDIUM', 'LOW'].map(level => ({ name: level, value: exceptions.filter(item => item.severity === level).length })).filter(item => item.value > 0);
  return <Card className="border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"><CardHeader><CardTitle className="border-b-[3px] border-black pb-2 text-xl font-black uppercase tracking-tight">Exception severity</CardTitle><p className="text-sm font-medium text-zinc-500">Open alerts requiring operator attention.</p></CardHeader><CardContent>{data.length === 0 ? <div className="flex h-72 items-center justify-center rounded-md border-2 border-dashed border-zinc-300 text-sm text-zinc-500">No open exceptions.</div> : <div className="grid h-72 grid-cols-2 items-center gap-2"><div className="h-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={92} paddingAngle={3} stroke="#000" strokeWidth={2}>{data.map(item => <Cell key={item.name} fill={COLORS[item.name]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="space-y-3">{data.map(item => <div key={item.name} className="flex items-center justify-between border-2 border-black p-2"><span className="flex items-center gap-2 text-xs font-black"><span className="h-3 w-3 border border-black" style={{ backgroundColor: COLORS[item.name] }} />{item.name}</span><span className="font-mono font-black">{item.value}</span></div>)}</div></div>}</CardContent></Card>;
}
