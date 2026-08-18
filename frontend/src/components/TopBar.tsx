import { useState } from 'react';
import { Command, Zap, AlertCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CommandPaletteModal } from './CommandPaletteModal';

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const getSectionTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Command Center';
    if (path.startsWith('/orders')) return 'Orders & Workflow';
    if (path.startsWith('/inventory')) return 'Inventory Bins';
    if (path.startsWith('/fulfillment')) return 'Fulfillment Board';
    if (path.startsWith('/exceptions')) return 'Exceptions Feed';
    if (path.startsWith('/simulate')) return 'Scenario Simulator';
    return 'Dashboard';
  };

  return (
    <>
      <header className="h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 fixed top-0 right-0 left-0 z-20 flex items-center justify-between px-6 transition-all duration-300">
        {/* Left Section: Breadcrumbs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="font-semibold text-slate-400 font-mono">FlowForge</span>
            <span className="text-slate-600" aria-hidden="true">/</span>
            <h1 className="font-bold text-white tracking-tight text-base">
              {getSectionTitle()}
            </h1>
          </div>
        </div>

        {/* Right Section: Heartbeat & Command Search */}
        <div className="flex items-center gap-3">
          {/* Quick Actions */}
          <button
            type="button"
            onClick={() => navigate('/exceptions')}
            aria-label="Report Exception"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded-xl transition-all"
          >
            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Report Exception</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/simulate')}
            aria-label="Simulate Scenario"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-xl transition-all"
          >
            <Zap className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Simulate Scenario</span>
          </button>

          {/* Search Trigger */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search and command palette (Press Command or Control K)"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all cursor-pointer shadow-sm hover:border-indigo-500/50"
          >
            <Command className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
            <span>Search</span>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-slate-900 border border-slate-700 rounded text-slate-400">
              <span>⌘</span>K
            </kbd>
          </button>
        </div>
      </header>

      <CommandPaletteModal open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}

