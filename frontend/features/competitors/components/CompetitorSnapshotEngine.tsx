'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CompetitorKeywordSnapshot } from '@/types/competitor-intelligence';

export function CompetitorSnapshotEngine() {
  const [keyword, setKeyword] = useState('best crypto casino');
  const [snapshot, setSnapshot] = useState<CompetitorKeywordSnapshot | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = keyword.trim();

    if (value.length < 2) {
      setError('Enter a keyword with at least 2 characters.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSnapshot(null);

    try {
      const response = await fetch('/api/competitor-intelligence/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: value, limit: 10, locationCode: 2840, languageCode: 'en', device: 'desktop' }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || 'Snapshot failed.');
      }

      setSnapshot(payload as CompetitorKeywordSnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Snapshot failed.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Top-10 SERP snapshot engine</CardTitle>
          <CardDescription>Fetch US organic competitors, crawl each ranking page, extract deterministic SEO/CRO/content features, and store the snapshot.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  className="pl-9"
                  disabled={isLoading}
                  placeholder="Enter keyword"
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting
                  </>
                ) : (
                  'Run snapshot'
                )}
              </Button>
            </div>
            {isLoading ? <p className="text-sm text-slate-400">Crawling top US organic competitors. This can take 30-90 seconds.</p> : null}
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          </form>
        </CardContent>
      </Card>

      {snapshot ? <SnapshotTable snapshot={snapshot} /> : null}
    </div>
  );
}

function SnapshotTable({ snapshot }: { snapshot: CompetitorKeywordSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Stored SERP competitor snapshot</CardTitle>
            <CardDescription>
              {snapshot.keyword} · United States SERP · {snapshot.organicResultsCount} organic competitors · {new Date(snapshot.capturedAt).toLocaleString()}
            </CardDescription>
          </div>
          <Badge variant="accent">{snapshot.id.slice(0, 8)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Position</TableHead>
              <TableHead>Ranking URL</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Words</TableHead>
              <TableHead>FAQ</TableHead>
              <TableHead>Tables</TableHead>
              <TableHead>CTA</TableHead>
              <TableHead>Text phrases</TableHead>
              <TableHead>SEO text phrases</TableHead>
              <TableHead>Trust signals</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshot.competitorSnapshots.map((competitor) => {
              const features = competitor.extractedFeatures;
              const trustSignals = [
                ...(features?.trustSignals ?? []),
                ...(features?.kycMentions ? ['KYC'] : []),
                ...(features?.provablyFair ? ['provably fair'] : []),
                ...(features?.licenses ?? []),
              ];

              return (
                <TableRow key={competitor.id} className="hover:bg-slate-900/50">
                  <TableCell>#{competitor.position}</TableCell>
                  <TableCell className="max-w-sm">
                    <Link href={`/competitors/${snapshot.id}/${competitor.id}`} className="block text-sky-300 hover:text-sky-200">
                      <span className="block font-medium">{competitor.domain}</span>
                      <span className="mt-1 block truncate text-xs text-slate-500">{competitor.rankingUrl || competitor.url}</span>
                    </Link>
                    {competitor.crawlStatus !== 'success' ? (
                      <p className="mt-1 text-xs text-amber-300">{competitor.extractedFeatures?.extractionQuality || competitor.crawlStatus}: {competitor.crawlError}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={competitor.resultQuality === 'PROCESSABLE' ? 'accent' : 'secondary'} className="normal-case">
                      {competitor.resultQuality?.toLowerCase().replace(/_/g, ' ') ?? 'unknown'}
                    </Badge>
                    {competitor.extractionConfidence !== null && competitor.extractionConfidence !== undefined ? (
                      <p className="mt-1 text-xs text-slate-500">{competitor.extractionConfidence}% confidence</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-xs text-slate-300">
                    <Link href={`/competitors/${snapshot.id}/${competitor.id}`} className="hover:text-sky-200">
                      {competitor.title || 'Untitled'}
                    </Link>
                  </TableCell>
                  <TableCell>{features?.wordCount?.toLocaleString() ?? '-'}</TableCell>
                  <TableCell>{features?.faqCount ?? '-'}</TableCell>
                  <TableCell>{features?.tableCount ?? '-'}</TableCell>
                  <TableCell>{features?.ctaCount ?? '-'}</TableCell>
                  <TableCell><InlineTags values={features?.textKeywordPhrases ?? features?.moneyKeywords ?? []} /></TableCell>
                  <TableCell><InlineTags values={features?.seoKeywordPhrases ?? []} /></TableCell>
                  <TableCell><InlineTags values={trustSignals} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function InlineTags({ values }: { values: string[] }) {
  const visible = [...new Set(values)].slice(0, 5);

  if (!visible.length) {
    return <span className="text-slate-500">None</span>;
  }

  return (
    <div className="flex max-w-xs flex-wrap gap-1.5">
      {visible.map((value) => (
        <Badge key={value} variant="secondary" className="tracking-normal normal-case">
          {value}
        </Badge>
      ))}
    </div>
  );
}
