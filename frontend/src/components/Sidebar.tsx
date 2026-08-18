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
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Command Center', icon: LayoutDashboard, shortcut: 'G then C' },
  { path: '/orders', label: 'Orders', icon: Package, shortcut: 'G then O' },
  { path: '/inventory', label: 'Inventory', icon: Boxes, shortcut: 'G then I' },
  { path: '/fulfillment', label: 'Fulfillment', icon: Truck, shortcut: 'G then F' },
  { path: '/exceptions', label: 'Exceptions', icon: AlertTriangle, shortcut: 'G then E' },
  { path: '/simulate', label: 'Simulate Event', icon: Cpu, shortcut: 'G then S' },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className="bg-white text-zinc-900 border-b border-zinc-200 flex items-center h-14 fixed left-0 right-0 top-0 z-20">
      <div className="flex items-center gap-3 px-5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-zinc-950 font-mono">FlowForge</h1>
          <button onClick={onToggle} aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'} title={collapsed ? 'Open sidebar' : 'Close sidebar'} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        {!collapsed && <p className="text-xs text-zinc-500 mt-1">Warehouse Decision Operations</p>}
      </div>
      
      <nav className="flex flex-1 items-center justify-center gap-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-zinc-950 text-white font-medium shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
              )}
            >
              <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
                <Icon className="w-4 h-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
      
      <div className="hidden items-center px-5 text-xs text-zinc-500 font-mono xl:flex">Decision Operations</div>
    </aside>
  );
}
