import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Truck,
  AlertTriangle,
  Cpu,
  Command,
  Zap,
  Sparkles,
} from 'lucide-react';

import { CommandPaletteModal } from './CommandPaletteModal';
import { cn } from '../lib/utils';

const navLinks = [
  { path: '/', label: 'Overview', icon: Sparkles },
  { path: '/#command-center', label: 'Command Center', icon: LayoutDashboard },
  { path: '/orders', label: 'Orders', icon: Package },
  { path: '/inventory', label: 'Inventory', icon: Boxes },
  { path: '/fulfillment', label: 'Fulfillment', icon: Truck },
  { path: '/exceptions', label: 'Exceptions', icon: AlertTriangle },
  { path: '/simulate', label: 'Simulator', icon: Cpu },
];

export function HorizontalNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const handleNavClick = (path: string, e: React.MouseEvent) => {
    if (path.startsWith('/#')) {
      e.preventDefault();
      const targetId = path.replace('/#', '');
      if (location.pathname === '/') {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        navigate('/');
        setTimeout(() => {
          const element = document.getElementById(targetId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#16192b]/90 backdrop-blur-xl border-b border-[#424769]/50 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link
            to="/"
            aria-label="FlowForge WMS Home"
            className="flex items-center gap-3 shrink-0 group focus-visible:ring-2 focus-visible:ring-[#f9b17a] rounded-xl p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2d3250] to-[#f9b17a] p-0.5 shadow-md shadow-[#f9b17a]/15 transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-[#16192b] rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#f9b17a] fill-[#f9b17a]" aria-hidden="true" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-white font-heading flex items-center gap-1.5">
                FlowForge
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f9b17a]/15 text-[#f9b17a] font-bold border border-[#f9b17a]/30">
                  WMS
                </span>
              </span>
              <span className="text-[11px] text-[#9ba3c9] font-medium tracking-wide">Warehouse Decision Ops</span>
            </div>
          </Link>

          {/* Horizontal Navigation Menu */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1 bg-[#2d3250]/70 p-1.5 rounded-2xl border border-[#424769]/40 backdrop-blur-md">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/'
                  ? location.pathname === '/' && !location.hash
                  : location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(e) => handleNavClick(item.path, e)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer',
                    isActive
                      ? 'bg-[#f9b17a] text-[#16192b] shadow-md shadow-[#f9b17a]/20 font-bold'
                      : 'text-[#d1d5db] hover:text-white hover:bg-[#424769]/50'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? 'text-[#16192b]' : 'text-[#9ba3c9]')} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Search Trigger */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette (Press Command or Control K)"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#d1d5db] bg-[#2d3250]/90 hover:bg-[#424769]/80 border border-[#424769]/60 rounded-xl transition-all cursor-pointer shadow-sm hover:border-[#f9b17a]/40"
            >
              <Command className="w-3.5 h-3.5 text-[#f9b17a]" aria-hidden="true" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-[#16192b] border border-[#424769] rounded text-[#9ba3c9]">
                <span>⌘</span>K
              </kbd>
            </button>

            {/* Quick CTA */}
            <button
              type="button"
              onClick={() => navigate('/simulate')}
              aria-label="Open Scenario Simulator"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#16192b] bg-[#f9b17a] hover:bg-[#fa9d58] rounded-xl shadow-lg shadow-[#f9b17a]/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-[#16192b]" aria-hidden="true" />
              <span>Simulate</span>
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Sub-bar */}
        <nav aria-label="Mobile Navigation" className="lg:hidden flex items-center justify-start gap-1 px-4 py-2 overflow-x-auto border-t border-[#424769]/30 bg-[#2d3250]/90 scrollbar-none">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                onClick={(e) => handleNavClick(item.path, e)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition-colors',
                  isActive ? 'bg-[#f9b17a] text-[#16192b] font-bold' : 'text-[#d1d5db] hover:bg-[#424769]'
                )}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <CommandPaletteModal open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}

