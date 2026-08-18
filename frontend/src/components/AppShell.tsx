import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useState } from 'react';
import { KineticGrid } from './ui/KineticGrid';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useKeyboardShortcuts();
  // Start with the compact rail so the Command Center gets the full canvas on first load.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const sidebarWidth = 'ml-0';

  return (
    <KineticGrid className="bg-zinc-50">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(value => !value)} />
      <TopBar sidebarCollapsed={sidebarCollapsed} />
      <main className={`pt-28 p-6 transition-[margin] duration-200 ${sidebarWidth}`}>
        {children}
      </main>
    </KineticGrid>
  );
}
