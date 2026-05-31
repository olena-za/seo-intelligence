'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { SeoReport } from '@/types/report';

export function TestReportForm() {
  const [keyword, setKeyword] = useState('best crypto casino');
  const [report, setReport] = useState<SeoReport | null>(null);
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
    setReport(null);

    try {
      const response = await fetch('/api/analysis/test-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: value }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || 'Report generation failed.');
      }

      setReport(payload as SeoReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report generation failed.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SEO intelligence report</CardTitle>
          <CardDescription>Run DataForSEO, Firecrawl, and OpenAI against one keyword and render the normalized report.</CardDescription>
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
                  placeholder="Enter keyword"
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating
                  </>
                ) : (
                  'Generate report'
                )}
              </Button>
            </div>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            {isLoading ? <p className="text-sm text-slate-400">Running SERP collection, page crawl, and AI normalization...</p> : null}
          </form>
        </CardContent>
      </Card>

      {report ? <ReportCards report={report} /> : null}
    </div>
  );
}

function ReportCards({ report }: { report: SeoReport }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle>Summary</CardTitle>
                <CardDescription className="break-words">{report.summary.title}</CardDescription>
              </div>
              <Badge variant="accent" className="w-fit shrink-0">{report.pipeline.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Word count" value={report.summary.wordCount.toLocaleString()} />
              <Metric label="Crawl time" value={`${report.summary.crawlDurationMs}ms`} />
              <Metric label="Pipeline" value={`${report.pipeline.durationMs}ms`} />
            </div>
            <a className="mt-4 block break-words text-sm text-sky-300 hover:text-sky-200" href={report.summary.topUrl} target="_blank" rel="noreferrer">
              {report.summary.topUrl}
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Prioritized actions from the normalized OpenAI analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.recommendations.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <p className="text-sm leading-6 text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Semantic coverage</CardTitle>
            <CardDescription>Covered and missing topical signals.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <TagGroup label="Covered topics" values={report.semanticCoverage.coveredTopics} />
            <TagGroup label="Missing topics" values={report.semanticCoverage.missingTopics} tone="warning" />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Intent</CardTitle>
            <CardDescription>Primary and secondary query intent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Metric label="Primary" value={report.intent.primaryIntent} />
            <TagGroup label="Secondary" values={report.intent.secondaryIntents} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entities</CardTitle>
            <CardDescription>Key entities extracted by the analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <TagGroup label="Entities" values={report.entities} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Structure</CardTitle>
            <CardDescription>Detected content and quality signals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Signal label="FAQ detected" value={report.contentStructure.faqDetected} />
            <Signal label="Tables detected" value={report.contentStructure.tablesDetected} />
            <Signal label="Review content" value={report.contentStructure.reviewContent} />
            <Signal label="Author present" value={report.qualitySignals.authorPresent} />
            <Signal label="Schema present" value={report.qualitySignals.schemaPresent} />
            <Metric label="Headings" value={String(report.contentStructure.headingsCount)} />
            <Metric label="Topical depth" value={report.semanticCoverage.depth} />
            <Metric label="E-E-A-T" value={report.qualitySignals.eeatLevel} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function TagGroup({ label, values, tone = 'default' }: { label: string; values: string[]; tone?: 'default' | 'warning' }) {
  return (
    <div>
      <p className="mb-3 text-xs uppercase text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.length ? (
          values.map((value) => <Badge key={value} variant={tone === 'warning' ? 'secondary' : 'accent'}>{value}</Badge>)
        ) : (
          <span className="text-sm text-slate-500">None detected</span>
        )}
      </div>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <Badge variant={value ? 'accent' : 'secondary'}>{value ? 'Yes' : 'No'}</Badge>
    </div>
  );
}
