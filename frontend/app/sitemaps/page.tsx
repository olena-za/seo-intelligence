import { API_BASE_URL } from '@/lib/constants/env';
import { SitemapIntelligencePanel } from '@/features/sitemaps/components/SitemapIntelligencePanel';
import type { SitemapSnapshot } from '@/types/sitemap-intelligence';

async function getSitemapSnapshots(): Promise<SitemapSnapshot[]> {
  const response = await fetch(`${API_BASE_URL}/sitemap-intelligence/snapshots`, { cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return [];
  return payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
}

export default async function SitemapsPage() {
  const snapshots = await getSitemapSnapshots();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8">
        <h1 className="text-3xl font-semibold text-slate-100">Sitemap intelligence</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Monitor competitor site expansion through robots.txt, sitemap indexes, nested sitemaps, and URL-level history.
        </p>
      </div>
      <SitemapIntelligencePanel initialSnapshots={snapshots} />
    </div>
  );
}
