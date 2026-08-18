import { ArrowRight, Boxes, Gauge, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function Intro() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-2xl bg-[#16192b] px-6 py-16 text-white shadow-xl sm:px-12 border border-[#424769]/50">
      <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
        <p className="mb-6 rounded-full border border-[#424769] bg-[#2d3250] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#f9b17a]">
          FlowForge WMS
        </p>
        <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-6xl font-heading">
          Make every warehouse decision visible.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-[#d1d5db]">
          A live command surface for order risk, inventory availability, fulfillment flow, and exception response.
        </p>
        <Button
          variant="primary"
          onClick={() => navigate('/')}
          aria-label="Open Command Center"
          className="mt-9 gap-2 shadow-xl shadow-[#f9b17a]/20 text-base px-8 py-3.5"
        >
          Open Command Center <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="mt-16 grid w-full gap-4 text-left md:grid-cols-3">
          {[
            ['Live decisions', Gauge, 'See bottlenecks and priorities as they change in real time.'],
            ['Inventory truth', Boxes, 'Track stock, allocation, and reorder pressure across warehouse bins.'],
            ['Controlled response', ShieldCheck, 'Resolve exceptions with clear next actions and automated mitigation.'],
          ].map(([title, Icon, body]) => {
            const FeatureIcon = Icon as typeof Gauge;
            return (
              <div key={title as string} className="glass-card rounded-2xl border border-[#424769]/50 p-6">
                <FeatureIcon className="mb-4 h-6 w-6 text-[#f9b17a]" aria-hidden="true" />
                <h2 className="text-lg font-bold text-white font-heading">{title as string}</h2>
                <p className="mt-2 text-xs leading-relaxed text-[#d1d5db] font-medium">{body as string}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

