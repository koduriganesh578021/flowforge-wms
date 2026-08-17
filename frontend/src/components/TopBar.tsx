import { Command } from 'lucide-react';

export function TopBar() {
  const handleCommandPalette = () => {
    // TODO: Implement command palette
    console.log('Command palette triggered');
  };

  return (
    <header className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-4 fixed top-0 left-56 right-0 z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-zinc-900">Operations Console</h2>
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
