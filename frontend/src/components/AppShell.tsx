import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar />
      <TopBar />
      <main className="pt-14 ml-56 p-6">
        {children}
      </main>
    </div>
  );
}
