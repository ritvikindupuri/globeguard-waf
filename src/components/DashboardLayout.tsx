import { ReactNode } from 'react';
import WAFSidebar from '@/components/WAFSidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background mesh-gradient">
      <WAFSidebar />
      <main className="ml-64 p-6 min-h-screen">
        {children}
      </main>
    </div>
  );
}
