'use client';

import { Menu, Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface TopNavProps {
  onMenuClick: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-4 z-30 flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/95 px-4 py-4 shadow-panel backdrop-blur-sm backdrop-saturate-150">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500 sm:text-sm">Operations</p>
          <h1 className="truncate text-base font-semibold text-slate-100 sm:text-lg">SEO Intelligence Dashboard</h1>
        </div>
      </div>
      <div className="shrink-0 items-center gap-3 sm:flex">
        <Button variant="ghost" className="hidden items-center gap-2 md:flex">
          <Search className="h-4 w-4" /> Search
        </Button>
        <Button variant="ghost">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
