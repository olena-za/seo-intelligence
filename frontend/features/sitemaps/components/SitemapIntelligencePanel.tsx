'use client';

import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SitemapSnapshot } from '@/types/sitemap-intelligence';

export function SitemapIntelligencePanel({ initialSnapshots }: { initialSnapshots: SitemapSnapshot[] }) {
  const [domain, setDomain] = useState(initialSnapshots[0]?.domain ?? '');
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [active, setActive] = useState<SitemapSnapshot | null>(initialSnapshots[0] ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!domain.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/sitemap-intelligence/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Sitemap collection failed.');
      setActive(payload);
      setSnapshots([payload, ...snapshots.filter((item) => item.id !== payload.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sitemap collection failed.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sitemap intelligence</CardTitle>
          <CardDescription>Track robots.txt sitemap discovery, URL changes, freshness, and category expansion over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input value={domain} onChange={(event) => setDomain(event.target.value)} className="pl-9" placeholder="example.com" disabled={isLoading} />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Collecting</> : 'Collect sitemap'}
              </Button>
            </div>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          </form>
        </CardContent>
      </Card>

      {active ? <SitemapSnapshotView snapshot={active} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent sitemap snapshots</CardTitle>
          <CardDescription>Stored historical sitemap captures.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {snapshots.map((snapshot) => (
              <button
                key={snapshot.id}
                type="button"
                onClick={() => setActive(snapshot)}
                className="rounded-lg border border-slate-800 px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-900"
              >
                <span className="block font-medium text-slate-100">{snapshot.domain}</span>
                <span className="text-xs text-slate-500">{new Date(snapshot.capturedAt).toLocaleString()}</span>
              </button>
            ))}
            {!snapshots.length ? <p className="text-sm text-slate-500">No sitemap snapshots yet.</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SitemapSnapshotView({ snapshot }: { snapshot: SitemapSnapshot }) {
  const added = snapshot.diffs.filter((item) => item.changeType === 'ADDED');
  const removed = snapshot.diffs.filter((item) => item.changeType === 'REMOVED');

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Total URLs" value={snapshot.totalUrls.toLocaleString()} />
        <Metric title="New URLs" value={snapshot.addedUrlsCount.toLocaleString()} />
        <Metric title="Removed URLs" value={snapshot.removedUrlsCount.toLocaleString()} />
        <Metric title="Fresh URLs" value={snapshot.freshnessVelocity.toLocaleString()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Keyword cluster expansion</CardTitle>
          <CardDescription>New sitemap paths grouped into useful competitive themes.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {snapshot.categoryExpansions.length ? snapshot.categoryExpansions.slice(0, 24).map((item) => <Badge key={item} variant="secondary" className="normal-case">{item}</Badge>) : <p className="text-sm text-slate-500">No new category expansion detected.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <UrlDiffTable title="Newly added pages" rows={added} />
        <UrlDiffTable title="Removed pages" rows={removed} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Freshness activity</CardTitle>
          <CardDescription>Latest sitemap URLs and lastmod signals.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead>Cluster</TableHead>
                <TableHead>Last modified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.urls.slice(0, 20).map((url) => (
                <TableRow key={url.url}>
                  <TableCell className="max-w-md truncate">{url.path}</TableCell>
                  <TableCell>{url.semanticCluster ? <Badge variant="secondary" className="normal-case">{url.semanticCluster}</Badge> : <span className="text-slate-500">-</span>}</TableCell>
                  <TableCell>{url.lastmod ? new Date(url.lastmod).toLocaleDateString() : <span className="text-slate-500">unknown</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-slate-400">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-slate-100">{value}</p>
      </CardContent>
    </Card>
  );
}

function UrlDiffTable({ title, rows }: { title: string; rows: SitemapSnapshot['diffs'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{rows.length} URLs</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Cluster</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 20).map((row) => (
              <TableRow key={`${title}-${row.url}`}>
                <TableCell className="max-w-lg truncate">{row.url}</TableCell>
                <TableCell>{row.semanticCluster ? <Badge variant="secondary" className="normal-case">{row.semanticCluster}</Badge> : <span className="text-slate-500">-</span>}</TableCell>
              </TableRow>
            ))}
            {!rows.length ? <TableRow><TableCell colSpan={2} className="text-slate-500">No changes detected.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
