'use client';

import Link from 'next/link';
import { Home, Layers, Search, Sparkles, BarChart3, Settings, Users, Network } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Projects', href: '/projects', icon: Layers },
  { label: 'Keywords', href: '/keywords', icon: Search },
  { label: 'Competitors', href: '/competitors', icon: Users },
  { label: 'Sitemaps', href: '/sitemaps', icon: Network },
  { label: 'Analysis', href: '/analysis', icon: BarChart3 },
  { label: 'Snapshots', href: '/snapshots', icon: Sparkles },
  { label: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  return (
    <>
      <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-panel lg:flex">
        <div className="flex items-center justify-between gap-2 px-1 pb-4">
          <div>
            <p className="text-sm font-semibold tracking-[0.24px] text-slate-200">SEO Intelligence</p>
            <p className="text-xs text-slate-500">Operations dashboard</p>
          </div>
          <Badge variant="secondary">MVP</Badge>
        </div>
        <Separator className="mb-4" />
        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors',
                  'text-slate-300 hover:bg-slate-900 hover:text-slate-50'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 rounded-2xl bg-slate-900 px-4 py-4 text-sm text-slate-400">
          <p className="font-medium text-slate-100">SEO Operations</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Track projects, content snapshots, and competitor signal in one place.
          </p>
        </div>
      </aside>

      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="left" className="w-72 bg-slate-950">
            <div className="flex items-center justify-between gap-2 px-1 pb-4">
              <div>
                <p className="text-sm font-semibold tracking-[0.24px] text-slate-200">SEO Intelligence</p>
                <p className="text-xs text-slate-500">Operations</p>
              </div>
              <Badge variant="secondary">MVP</Badge>
            </div>
            <Separator className="mb-4" />
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-900 hover:text-slate-50"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
