import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useKeyboardShortcuts();

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <TopBar />
      <main className="pt-14 ml-56 p-6">
        {children}
      </main>
    </div>
  );
}
