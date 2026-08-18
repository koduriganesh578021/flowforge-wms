import { ArrowRight, Boxes, Gauge, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function Intro() {
  const navigate = useNavigate();
  return (
    <main className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-2xl bg-zinc-950 px-6 py-16 text-white shadow-xl sm:px-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
        <p className="mb-6 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">FlowForge WMS</p>
        <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">Make every warehouse decision visible.</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400">A live command surface for order risk, inventory availability, fulfillment flow, and exception response.</p>
        <Button variant="primary" onClick={() => navigate('/')} className="mt-9 gap-2 bg-white text-zinc-950 hover:bg-zinc-200">Open Command Center <ArrowRight className="h-4 w-4" /></Button>
        <div className="mt-16 grid w-full gap-4 text-left md:grid-cols-3">
          {[['Live decisions', Gauge, 'See bottlenecks and priorities as they change.'], ['Inventory truth', Boxes, 'Track stock, allocation, and reorder pressure.'], ['Controlled response', ShieldCheck, 'Resolve exceptions with clear next actions.']].map(([title, Icon, body]) => {
            const FeatureIcon = Icon as typeof Gauge;
            return <div key={title as string} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5"><FeatureIcon className="mb-4 h-5 w-5 text-emerald-300" /><h2 className="font-bold">{title as string}</h2><p className="mt-2 text-sm leading-6 text-zinc-400">{body as string}</p></div>;
          })}
        </div>
      </div>
    </main>
  );
}
