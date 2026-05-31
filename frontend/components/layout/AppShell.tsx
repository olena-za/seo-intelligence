'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === '/login' || pathname === '/register') {
    return <div className="min-h-dvh bg-slate-950 text-slate-100">{children}</div>;
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px] gap-5 px-4 py-4 sm:px-5 lg:px-6">
        <Sidebar open={isNavOpen} onOpenChange={setIsNavOpen} />
        <div className="min-w-0 flex-1">
          <TopNav onMenuClick={() => setIsNavOpen(true)} />
          <main className="mt-5 min-w-0 space-y-6 pb-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
