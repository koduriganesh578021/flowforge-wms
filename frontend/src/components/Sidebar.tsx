import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Truck,
  AlertTriangle,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';


const mainNavItems = [
  { path: '/', label: 'Command Center', icon: LayoutDashboard, badge: 'Live' },
  { path: '/orders', label: 'Orders & Allocation', icon: Package },
  { path: '/inventory', label: 'Inventory Bins', icon: Boxes },
  { path: '/fulfillment', label: 'Fulfillment Board', icon: Truck },
];

const intelligenceNavItems = [
  { path: '/exceptions', label: 'Exceptions Feed', icon: AlertTriangle, color: 'text-amber-400' },
  { path: '/simulate', label: 'Scenario Simulator', icon: Cpu, color: 'text-indigo-400' },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 bottom-0 z-30 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/80 flex flex-col transition-all duration-300 shadow-2xl',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        <Link to="/" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-white font-mono flex items-center gap-1.5">
                FlowForge
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  WMS
                </span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Warehouse Decisions</span>
            </div>
          )}
        </Link>

        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Core Operations Group */}
        <div>
          {!collapsed && (
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Operations
            </p>
          )}
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative',
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  )}
                >
                  <Icon className={cn('w-5 h-5 shrink-0 transition-transform group-hover:scale-110', isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200')} />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Intelligence & Simulation Group */}
        <div>
          {!collapsed && (
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Decision Engine
            </p>
          )}
          <nav className="space-y-1">
            {intelligenceNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative',
                    isActive
                      ? 'bg-slate-800 border border-slate-700 text-white shadow-md font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  )}
                >
                  <Icon className={cn('w-5 h-5 shrink-0 transition-transform group-hover:scale-110', item.color)} />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar Footer Status */}
      <div className="p-3 border-t border-slate-800/80">
        {!collapsed ? (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-500/50 animate-pulse shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-200 truncate">System Online</span>
              <span className="text-[10px] text-slate-400 font-mono">SQLite • 54/54 Tests</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1" title="System Online">
            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-md shadow-emerald-500/50 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
}
