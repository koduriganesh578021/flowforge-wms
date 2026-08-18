import { HorizontalNavbar } from './HorizontalNavbar';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useKeyboardShortcuts();

  return (
    <div className="min-h-screen bg-[#141727] text-white font-heading selection:bg-[#f9b17a] selection:text-[#16192b] flex flex-col">
      {/* Skip to Main Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only fixed top-3 left-3 z-50 bg-[#f9b17a] text-[#16192b] font-bold px-4 py-2.5 rounded-xl shadow-2xl transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#16192b]"
      >
        Skip to main content
      </a>

      {/* Horizontal Sticky Navbar */}
      <HorizontalNavbar />

      {/* Main Content Viewport */}
      <main id="main-content" tabIndex={-1} className="flex-1 w-full mx-auto focus:outline-none">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#424769]/40 bg-[#16192b]/80 py-8 px-6 text-center text-xs text-[#9ba3c9] mt-16 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wide">FlowForge WMS</span>
            <span aria-hidden="true">•</span>
            <span>Autonomous Warehouse Decision Operations</span>
          </div>
          <p className="font-mono text-[11px]">
            System Status: <span className="text-[#f9b17a] font-bold">100% HEALTHY</span> (SQLite/Postgres Ready)
          </p>
        </div>
      </footer>
    </div>
  );
}

