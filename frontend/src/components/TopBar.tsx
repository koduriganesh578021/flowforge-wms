import { Command } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export function TopBar(_props: { sidebarCollapsed?: boolean }) {
  const location = useLocation();
  const section = location.pathname === '/' ? 'Command Center' : location.pathname.slice(1).split('/')[0];
  const handleCommandPalette = () => {
    // TODO: Implement command palette
    console.log('Command palette triggered');
  };

  return (
    <header className="h-14 bg-white/95 backdrop-blur border-b border-zinc-200 flex items-center justify-between px-6 fixed top-14 left-0 right-0 z-10">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">FlowForge Decision Platform</p>
          <h2 className="text-sm font-bold capitalize text-zinc-900">{section}</h2>
        </div>
      </div>
      
      <button
        onClick={handleCommandPalette}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors"
      >
        <Command className="w-4 h-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono bg-white border border-zinc-300 rounded">
          <span>⌘</span>K
        </kbd>
      </button>
    </header>
  );
}
