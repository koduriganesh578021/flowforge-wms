import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Truck,
  AlertTriangle,
  Cpu,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';

interface CommandPaletteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPaletteModal({ open, onOpenChange }: CommandPaletteModalProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search sections, orders, SKUs..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleSelect('/')}>
            <LayoutDashboard className="mr-2 h-4 w-4 text-zinc-500" />
            <span>Command Center</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('/orders')}>
            <Package className="mr-2 h-4 w-4 text-zinc-500" />
            <span>Orders & Workflows</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('/inventory')}>
            <Boxes className="mr-2 h-4 w-4 text-zinc-500" />
            <span>Inventory Bins & SKUs</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('/fulfillment')}>
            <Truck className="mr-2 h-4 w-4 text-zinc-500" />
            <span>Fulfillment Board</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('/exceptions')}>
            <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
            <span>Exceptions & Disruptions</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('/simulate')}>
            <Cpu className="mr-2 h-4 w-4 text-blue-500" />
            <span>Event Simulator</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => handleSelect('/exceptions')}>
            <AlertTriangle className="mr-2 h-4 w-4 text-rose-500" />
            <span>Report Damaged / Missing Inventory</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('/simulate')}>
            <Cpu className="mr-2 h-4 w-4 text-emerald-500" />
            <span>Run Allocation Simulation</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
