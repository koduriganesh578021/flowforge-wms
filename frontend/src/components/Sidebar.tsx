import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { 
  LayoutDashboard, 
  Package, 
  Boxes, 
  Truck, 
  AlertTriangle 
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Command Center', icon: LayoutDashboard },
  { path: '/orders', label: 'Orders', icon: Package },
  { path: '/inventory', label: 'Inventory', icon: Boxes },
  { path: '/fulfillment', label: 'Fulfillment', icon: Truck },
  { path: '/exceptions', label: 'Exceptions', icon: AlertTriangle },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-56 bg-zinc-900 text-zinc-100 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold text-white">FlowForge WMS</h1>
        <p className="text-xs text-zinc-400 mt-1">Warehouse Decision Operations</p>
      </div>
      
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive 
                  ? 'bg-zinc-800 text-white font-medium' 
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-500">Phase 5B Build</p>
      </div>
    </aside>
  );
}
