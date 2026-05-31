import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompetitorKeywordSnapshot, CompetitorSnapshotRow } from '@/types/competitor-intelligence';

type EvidenceRow = {
  signal: string;
  change: string;
  assumption: string;
  examples?: string[];
  addedExamples?: string[];
  removedExamples?: string[];
  previousContext?: string[];
  currentContext?: string[];
};

type AssumptionRow = {
  assumptionType?: string;
  summary?: string;
  confidence?: number;
  structured?: {
    window: string;
    movement: string;
    evidence: EvidenceRow[];
    keywords: EvidenceRow[];
    elements: EvidenceRow[];
    caveat: string;
  };
};

async function getSnapshot(snapshotId: string): Promise<CompetitorKeywordSnapshot | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
  const response = await fetch(`${baseUrl}/api/competitor-intelligence/snapshots/${snapshotId}`, { cache: 'no-store' });

  if (!response.ok) return null;
  return response.json();
}

async function getPageDetail(pageId: string): Promise<CompetitorSnapshotRow | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
  const response = await fetch(`${baseUrl}/api/competitor-intelligence/pages/${pageId}`, { cache: 'no-store' });

  if (!response.ok) return null;
  return response.json();
}

export default async function CompetitorPageDetail({ params }: { params: Promise<{ snapshotId: string; pageId: string }> }) {
  const { snapshotId, pageId } = await params;
  const snapshot = await getSnapshot(snapshotId);
  const page = snapshot?.competitorSnapshots.find((item) => item.id === pageId);

  if (!snapshot || !page) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ranking page not found</CardTitle>
            <CardDescription>The stored snapshot or ranking-page record could not be loaded.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/competitors" className="text-sm text-sky-300 hover:text-sky-200">Back to competitors</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const features = page.extractedFeatures;
  const rawMarkdown = page.rawCrawlResponse?.markdownPreview ?? 'Raw markdown preview was not stored for this crawl.';
  const rawExtraction = { ...features, rankingUrl: page.rankingUrl, normalizedUrl: page.normalizedUrl, urlHash: page.urlHash };
  const latestRanking = page.rankingHistory?.[0];
  const hasPreviousCheck = Boolean(page.previousCheck);
  const hasMovement = typeof latestRanking?.positionDelta === 'number' && latestRanking.positionDelta !== 0;
  const lastMovementRow = !hasMovement
    ? (page.positionHistory ?? []).find((row) => typeof row.positionDelta === 'number' && row.positionDelta !== 0 && row.competitorSnapshotId !== page.id) ?? null
    : null;
  const lastMovementPage = lastMovementRow ? await getPageDetail(lastMovementRow.competitorSnapshotId) : null;
  const assumptionSource = hasMovement || !lastMovementPage ? page : lastMovementPage;
  const htmlInternalLinks = filterHtmlInternalLinks(page.internalLinkItems ?? []);
  const filteredAnchorTexts = normalizeAnchorTexts(features?.anchorTexts ?? []).slice(0, 30);
  const filteredHubReferences = (features?.hubPageReferences ?? []).filter(isLikelyHtmlPageUrl).slice(0, 20);
  const comparisonWindow = hasPreviousCheck
    ? `${formatDateTime(page.previousCheck?.capturedAt)} to ${formatDateTime(snapshot.capturedAt)}`
    : null;
  const correlationAssumption = buildCorrelationAssumption(assumptionSource, snapshot.capturedAt);
  const serpConclusion = buildSerpChangeConclusion(assumptionSource, snapshot.keyword);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Ranking page</p>
            <h1 className="mt-3 break-words text-3xl font-semibold text-slate-100">{page.title || 'Untitled ranking page'}</h1>
            <a href={page.rankingUrl || page.url} target="_blank" rel="noreferrer" className="mt-3 block break-words text-sm text-sky-300 hover:text-sky-200">
              {page.rankingUrl || page.url}
            </a>
            <p className="mt-3 text-sm text-slate-500">Checked {formatDateTime(snapshot.capturedAt)}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge variant="accent">#{page.position}</Badge>
            <Badge variant={features?.extractionQuality === 'extraction_success' ? 'accent' : 'secondary'}>
              {features?.extractionQuality ?? page.crawlStatus}
            </Badge>
          </div>
        </div>
      </div>

      <SerpConclusionPanel conclusion={hasMovement ? serpConclusion : null} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-5">
          <Section title="SEO signals" description="Deterministic extraction from the exact SERP ranking URL.">
            <MetricGrid
              items={[
                ['Title', features?.title || page.title || '-'],
                ['Meta description', features?.metaDescription || page.metaDescription || '-'],
                ['H1 / H2 / H3', `${features?.h1Count ?? 0} / ${features?.h2Count ?? 0} / ${features?.h3Count ?? 0}`],
                ['Word count', String(features?.wordCount ?? 0)],
                ['FAQ count', String(features?.faqCount ?? 0)],
                ['Table count', String(features?.tableCount ?? 0)],
              ]}
            />
          </Section>

          <Section title="Semantic analysis" description="Keyword/entity presence and semantic cluster extraction.">
            <TagGroup label="Body phrases similar to target" values={features?.textKeywordPhrases ?? []} />
            <TagGroup label="SEO text phrases" values={features?.seoKeywordPhrases ?? []} />
            <TagGroup label="Money keywords" values={features?.moneyKeywords ?? features?.recurringMoneyKeywords ?? []} />
            <EntityPanel values={features?.primaryEntities ?? []} />
            <div className="grid gap-4 lg:grid-cols-2">
              <FrequencyTable title="Body phrase frequency" values={features?.keywordPhraseFrequency ?? {}} />
              <FrequencyTable title="SEO text frequency" values={features?.seoKeywordPhraseFrequency ?? {}} />
            </div>
            <SemanticClusterGrid clusters={features?.semanticClusters ?? {}} />
          </Section>

          {hasPreviousCheck ? (
            <Section title="Keyword usage history" description={`Phrase deltas versus the previous check (${comparisonWindow}).`}>
              <PhraseDeltaTable title="Body text changes" rows={features?.keywordUsageChange?.body ?? []} />
              <PhraseDeltaTable title="SEO text changes" rows={features?.keywordUsageChange?.seo ?? []} />
            </Section>
          ) : null}

          <Section title="CTA analysis" description="Conversion-oriented language found on the ranking page.">
            <MetricGrid items={[['CTA count', String(features?.ctaCount ?? 0)]]} />
            <TagGroup label="CTA wording" values={features?.ctaWording ?? []} />
          </Section>

          <Section title="Internal linking" description="Internal anchors and hub references from the crawled page.">
            <MetricGrid items={[['Internal link count', String(htmlInternalLinks.length || features?.internalLinksCount ?? 0)]]} />
            <TagGroup label="Anchor texts" values={filteredAnchorTexts} />
            <TagGroup label="Hub references" values={filteredHubReferences} />
            <InternalLinksTable rows={htmlInternalLinks} />
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Processing quality" description="Filtering and extraction confidence for this ranking page.">
            <MetricGrid
              items={[
                ['Result quality', page.resultQuality?.toLowerCase().replace(/_/g, ' ') || '-'],
                ['Extraction confidence', page.extractionConfidence === null || page.extractionConfidence === undefined ? '-' : `${page.extractionConfidence}%`],
                ['Render quality', page.renderQualityScore === null || page.renderQualityScore === undefined ? '-' : `${page.renderQualityScore}%`],
                ['Skipped', page.processingSkipped ? 'Yes' : 'No'],
                ['Skip reason', page.skipReason || '-'],
                ['Protection', page.protectionType || page.blockedBy || '-'],
              ]}
            />
          </Section>

          <Section title="Trust signals" description="Trust/compliance markers observed in the ranking page.">
            <TagGroup label="Trust signals" values={features?.trustSignals ?? []} />
            <TagGroup label="Licenses" values={features?.licenses ?? []} />
            <MetricGrid items={[['KYC mentions', features?.kycMentions ? 'Yes' : 'No'], ['Provably fair', features?.provablyFair ? 'Yes' : 'No']]} />
          </Section>

          <Section title="Freshness signals" description="Dates, newness language, bonus freshness, and release wording.">
            <TagGroup label="Freshness" values={features?.freshnessSignals ?? []} />
            <TagGroup label="Recent releases" values={features?.recentReleases ?? []} />
          </Section>

          <Section title="Historical position changes" description="SERP movement by check date for this same normalized ranking URL.">
            <MetricGrid
              items={[
                ['Current check', formatDateTime(snapshot.capturedAt)],
                ['Current position', `#${page.position}`],
                ['Previous check', hasPreviousCheck ? formatDateTime(page.previousCheck?.capturedAt) : 'None yet'],
                ['Previous position', hasPreviousCheck ? `#${page.previousCheck?.position}` : 'None yet'],
                ['Position change', hasPreviousCheck ? (hasMovement ? formatPositionDelta(latestRanking?.positionDelta ?? null) : '-') : 'None yet'],
                ['URL hash', page.urlHash || '-'],
              ]}
            />
            <PositionHistoryTable rows={page.positionHistory ?? []} currentSnapshotId={page.id} />
          </Section>
        </div>
      </div>

      <Section title="AI assumptions" description={hasMovement ? "Strategic assumptions generated only from stored ranking and content evidence." : "No movement on this check. Showing assumptions from the most recent check with movement."}>
        <AssumptionList rows={correlationAssumption ? [correlationAssumption, ...(assumptionSource.aiAssumptions ?? [])] : assumptionSource.aiAssumptions ?? []} />
      </Section>

      {hasPreviousCheck && hasMovement ? (
        <Section title="Historical diff panels" description={`Deterministic before/after comparison for ${comparisonWindow}.`}>
          <DiffTable rows={page.diffs ?? []} />
        </Section>
      ) : null}

      <Section title="Technical exports" description="Readable previews for operators, with raw markup available for technical review.">
        <div className="grid gap-4 lg:grid-cols-2">
          <TechnicalExportCard
            title="Raw markdown"
            description="Firecrawl markdown preview from the exact ranking URL."
            filename={`${page.domain}-${page.id}-markdown.md`}
            mimeType="text/markdown"
            content={rawMarkdown}
          >
            <MarkdownPreview markdown={rawMarkdown} />
          </TechnicalExportCard>
          <TechnicalExportCard
            title="Raw extraction JSON"
            description="Normalized feature payload stored for this ranking page."
            filename={`${page.domain}-${page.id}-features.json`}
            mimeType="application/json"
            content={JSON.stringify(rawExtraction, null, 2)}
          >
            <ExtractionSummary value={rawExtraction} />
          </TechnicalExportCard>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function SerpConclusionPanel({ conclusion }: { conclusion: string | null }) {
  if (!conclusion) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>SERP change conclusion</CardTitle>
        <CardDescription>Brief read on which measured page changes connect with the observed ranking movement.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="max-w-5xl text-sm leading-6 text-slate-300">{conclusion}</p>
      </CardContent>
    </Card>
  );
}

function MetricGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-2 break-words text-sm text-slate-100">{value}</p>
        </div>
      ))}
    </div>
  );
}

function TagGroup({ label, values, fallback = 'None detected' }: { label: string; values: string[]; fallback?: string }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.length ? values.slice(0, 24).map((value) => <Badge key={value} variant="secondary" className="tracking-normal normal-case">{value}</Badge>) : <p className="text-sm text-slate-500">{fallback}</p>}
      </div>
    </div>
  );
}

function EntityPanel({ values }: { values: string[] }) {
  const visible = values.slice(0, 18);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Primary entities</p>
          <p className="mt-1 text-sm text-slate-400">Main crypto, casino, compliance, and payment terms found in the page text.</p>
        </div>
        <Badge variant="secondary">{values.length}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {visible.length ? visible.map((value) => <Badge key={value} variant="secondary" className="tracking-normal normal-case">{value}</Badge>) : <p className="text-sm text-slate-500">No primary entities detected.</p>}
      </div>
    </div>
  );
}

function FrequencyTable({ title, values }: { title: string; values: Record<string, number> }) {
  const rows = Object.entries(values)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">{title}</p>
      {rows.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Phrase</th>
                <th className="w-24 px-3 py-2 text-left">Uses</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([phrase, count]) => (
                <tr key={`${title}-${phrase}`} className="border-t border-slate-800">
                  <td className="px-3 py-2 text-slate-200">{phrase}</td>
                  <td className="px-3 py-2 text-slate-300">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No matching phrase frequency detected.</p>
      )}
    </div>
  );
}

function SemanticClusterGrid({ clusters }: { clusters: Record<string, string[]> }) {
  const entries = Object.entries(clusters).filter(([, values]) => values.length > 0);

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">Semantic clusters</p>
      {entries.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {entries.map(([cluster, values]) => (
            <div key={cluster} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-medium capitalize text-slate-200">{cluster.replace(/([A-Z])/g, ' $1')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {values.slice(0, 12).map((value) => <Badge key={`${cluster}-${value}`} variant="secondary" className="tracking-normal normal-case">{value}</Badge>)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No semantic clusters detected.</p>
      )}
    </div>
  );
}

function TechnicalExportCard({
  title,
  description,
  filename,
  mimeType,
  content,
  children,
}: {
  title: string;
  description: string;
  filename: string;
  mimeType: string;
  content: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-100">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <a
          href={downloadHref(content, mimeType)}
          download={filename}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 px-3 text-sm font-medium text-slate-200 hover:bg-slate-900"
        >
          Export
        </a>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const headings = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^#{1,3}\s+/.test(line))
    .slice(0, 10)
    .map((line) => line.replace(/^#{1,3}\s+/, ''));
  const preview = markdown
    .replace(/[#*_`>\[\]()]/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">Detected headings</p>
        {headings.length ? <ol className="space-y-2 text-sm text-slate-300">{headings.map((heading) => <li key={heading} className="break-words">{heading}</li>)}</ol> : <p className="text-sm text-slate-500">No headings in stored preview.</p>}
      </div>
      <details className="rounded-xl border border-slate-800 p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-200">View markdown preview</summary>
        <div className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
          {preview.map((line) => <p key={line}>{line}</p>)}
        </div>
      </details>
    </div>
  );
}

function ExtractionSummary({ value }: { value: unknown }) {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const features = record.extractionQuality ? record : {};

  return (
    <div className="space-y-3">
      <MetricGrid
        items={[
          ['Extraction quality', String(features.extractionQuality ?? '-')],
          ['Ranking URL', String(record.rankingUrl ?? '-')],
          ['Normalized URL', String(record.normalizedUrl ?? '-')],
          ['URL hash', String(record.urlHash ?? '-')],
        ]}
      />
      <details className="rounded-xl border border-slate-800 p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-200">View raw JSON preview</summary>
        <pre className="mt-3 max-h-80 overflow-auto text-xs leading-6 text-slate-300">{JSON.stringify(value, null, 2)}</pre>
      </details>
    </div>
  );
}

function downloadHref(content: string, mimeType: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
}

function DiffTable({ rows }: { rows: NonNullable<CompetitorSnapshotRow['diffs']> }) {
  if (!rows.length) {
    return <p className="text-sm text-slate-500">No historical diffs yet. Run the same keyword again after content changes to populate this panel.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-900 text-xs uppercase tracking-[0.16em] text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left">Category</th>
            <th className="px-3 py-2 text-left">Field</th>
            <th className="px-3 py-2 text-left">Change</th>
            <th className="px-3 py-2 text-left">Severity</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 20).map((row) => (
            <tr key={`${row.category}-${row.field}`} className="border-t border-slate-800">
              <td className="px-3 py-2 text-slate-300">{row.category.replace(/_/g, ' ')}</td>
              <td className="px-3 py-2 text-slate-200">{row.field}</td>
              <td className="px-3 py-2 text-slate-400">{summarizeDelta(row.delta)}</td>
              <td className="px-3 py-2 text-slate-300">{row.severity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InternalLinksTable({ rows }: { rows: NonNullable<CompetitorSnapshotRow['internalLinkItems']> }) {
  const visible = filterHtmlInternalLinks(rows).slice(0, 12);

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">Stored internal links</p>
      {visible.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Anchor</th>
                <th className="px-3 py-2 text-left">Destination</th>
                <th className="px-3 py-2 text-left">Hub</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={`${row.destinationUrl}-${row.anchorText}`} className="border-t border-slate-800">
                  <td className="px-3 py-2 text-slate-200">{row.anchorText || '-'}</td>
                  <td className="max-w-sm truncate px-3 py-2 text-slate-400">{row.normalizedUrl || row.destinationUrl}</td>
                  <td className="px-3 py-2">{row.isHubReference ? <Badge variant="accent">Yes</Badge> : <span className="text-slate-500">No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No stored internal link rows yet.</p>
      )}
    </div>
  );
}

function filterHtmlInternalLinks(rows: NonNullable<CompetitorSnapshotRow['internalLinkItems']>) {
  return rows.filter((row) => isLikelyHtmlPageUrl(row.normalizedUrl || row.destinationUrl));
}

function normalizeAnchorTexts(values: string[]) {
  return values
    .map((value) => normalizeAnchorText(value))
    .filter((value) => value.length > 0)
    .filter((value) => !value.startsWith('http'));
}

function normalizeAnchorText(value: string) {
  return value
    .trim()
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^!\[?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyHtmlPageUrl(url: string) {
  const cleaned = url.trim();
  if (!cleaned) return false;

  const withoutHash = cleaned.split('#')[0] ?? '';
  const withoutQuery = (withoutHash.split('?')[0] ?? '').trim();
  if (!withoutQuery) return false;

  const pathname = (() => {
    if (withoutQuery.startsWith('/')) return withoutQuery;
    try {
      return new URL(withoutQuery).pathname;
    } catch {
      return '';
    }
  })().toLowerCase();

  if (!pathname) return false;
  if (pathname.startsWith('/cdn-cgi/')) return false;
  if (pathname.includes('/wp-content/uploads/')) return false;

  const lastSegment = pathname.split('/').filter(Boolean).pop() ?? '';
  const hasExtension = lastSegment.includes('.') && !lastSegment.endsWith('.');
  if (!hasExtension) return true;

  const extension = `.${lastSegment.split('.').pop() ?? ''}`;
  const htmlExtensions = new Set(['.html', '.htm', '.php', '.aspx', '.asp']);
  if (htmlExtensions.has(extension)) return true;

  const nonHtmlExtensions = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',
    '.ico',
    '.pdf',
    '.zip',
    '.rar',
    '.7z',
    '.mp3',
    '.wav',
    '.mp4',
    '.mov',
    '.webm',
    '.css',
    '.js',
    '.mjs',
    '.json',
    '.xml',
    '.txt',
    '.csv',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
  ]);

  return !nonHtmlExtensions.has(extension);
}

function AssumptionList({ rows }: { rows: AssumptionRow[] }) {
  if (!rows.length) {
    return <p className="text-sm leading-6 text-slate-400">No assumptions yet. A previous check is required before ranking/content correlation can be estimated.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={`${row.assumptionType}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-100">{row.assumptionType ?? 'assumption'}</p>
            <Badge variant="secondary">{row.confidence ?? 0}%</Badge>
          </div>
          {row.structured ? <CorrelationDashboard data={row.structured} confidence={row.confidence ?? 0} /> : <p className="mt-2 text-sm leading-6 text-slate-400">{row.summary}</p>}
        </div>
      ))}
    </div>
  );
}

function CorrelationDashboard({ data, confidence }: { data: NonNullable<AssumptionRow['structured']>; confidence: number }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <SignalMetric label="Window" value={data.window} />
        <SignalMetric label="Movement" value={data.movement} />
        <SignalMetric label="Confidence" value={`${confidence}%`} />
      </div>

      <EvidenceTable title="Measured changes" rows={data.evidence} />

      <div className="grid gap-4 xl:grid-cols-2">
        <EvidenceTable title="Keyword assumptions" rows={data.keywords} />
        <EvidenceTable title="Element assumptions" rows={data.elements} />
      </div>

      <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs leading-5 text-slate-500">{data.caveat}</p>
    </div>
  );
}

function SignalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function EvidenceTable({ title, rows }: { title: string; rows: EvidenceRow[] }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">{title}</p>
      {rows.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="w-44 px-3 py-2 text-left">Signal</th>
                <th className="w-[45%] px-3 py-2 text-left">Change</th>
                <th className="px-3 py-2 text-left">Assumption</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${row.signal}-${index}`} className="border-t border-slate-800 align-top">
                  <td className="px-3 py-3 font-medium text-slate-200">{row.signal}</td>
                  <td className="px-3 py-3 text-slate-300">
                    <p>{row.change}</p>
                    <ChangeExampleGroups row={row} />
                  </td>
                  <td className="px-3 py-3 text-slate-400">{row.assumption}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-500">No strong signal in this group.</p>
      )}
    </div>
  );
}

function ChangeExampleGroups({ row }: { row: EvidenceRow }) {
  const hasSplitExamples = Boolean(row.addedExamples?.length || row.removedExamples?.length);

  if (hasSplitExamples) {
    return (
      <div className="mt-3 space-y-2">
        <ExampleGroup label="Added" values={row.addedExamples ?? []} tone="added" />
        <ExampleGroup label="Removed" values={row.removedExamples ?? []} tone="removed" />
        <ContextComparison row={row} />
      </div>
    );
  }

  if (!row.examples?.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {row.examples.map((example) => (
        <Badge key={`${row.signal}-${example}`} variant="secondary" className="max-w-full whitespace-normal break-words tracking-normal normal-case">
          {example}
        </Badge>
      ))}
    </div>
  );
}

function ContextComparison({ row }: { row: EvidenceRow }) {
  if (!row.previousContext?.length && !row.currentContext?.length) return null;

  return (
    <details className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.14em] text-slate-400">View previous/current context</summary>
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <ContextColumn title="Previous" values={row.previousContext ?? []} highlight={row.removedExamples ?? []} tone="removed" />
        <ContextColumn title="Current" values={row.currentContext ?? []} highlight={row.addedExamples ?? []} tone="added" />
      </div>
    </details>
  );
}

function ContextColumn({ title, values, highlight, tone }: { title: string; values: string[]; highlight: string[]; tone: 'added' | 'removed' }) {
  const highlightSet = new Set(highlight);
  const highlightClass = tone === 'added' ? 'bg-emerald-400/15 text-emerald-100' : 'bg-rose-400/15 text-rose-100 line-through decoration-rose-300/70';

  return (
    <div className="rounded-lg border border-slate-800">
      <div className="border-b border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{title}</div>
      <div className="space-y-1 p-3 text-xs leading-5 text-slate-400">
        {values.length ? values.map((value, index) => (
          <p key={`${title}-${value}-${index}`} className={highlightSet.has(value) ? `rounded px-1.5 py-1 ${highlightClass}` : 'px-1.5 py-1'}>
            {value}
          </p>
        )) : <p className="px-1.5 py-1 text-slate-600">No stored context.</p>}
      </div>
    </div>
  );
}

function ExampleGroup({ label, values, tone }: { label: string; values: string[]; tone: 'added' | 'removed' }) {
  if (!values.length) return null;
  const color = tone === 'added' ? 'text-emerald-300' : 'text-rose-300';

  return (
    <div>
      <p className={`mb-1 text-[11px] font-medium uppercase tracking-[0.14em] ${color}`}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <Badge key={`${label}-${value}`} variant="secondary" className="max-w-full whitespace-normal break-words tracking-normal normal-case">
            {value}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function PositionHistoryTable({
  rows,
  currentSnapshotId,
}: {
  rows: NonNullable<CompetitorSnapshotRow['positionHistory']>;
  currentSnapshotId: string;
}) {
  const visible = rows.filter((row) => row.positionDelta === null || row.positionDelta === undefined || row.positionDelta !== 0).slice(0, 15);

  if (!visible.length) return null;

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">Position timeline</p>
      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Check date</th>
              <th className="px-3 py-2 text-left">Position</th>
              <th className="px-3 py-2 text-left">Vs prior check</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={`${row.competitorSnapshotId}-${row.capturedAt}`} className="border-t border-slate-800">
                <td className="px-3 py-2 text-slate-300">
                  {formatDateTime(row.capturedAt)}
                  {row.competitorSnapshotId === currentSnapshotId ? <Badge variant="accent" className="ml-2 tracking-normal normal-case">current</Badge> : null}
                </td>
                <td className="px-3 py-2 text-slate-200">#{row.position}</td>
                <td className="px-3 py-2 text-slate-400">{formatPositionDelta(row.positionDelta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function summarizeDelta(delta: unknown) {
  if (!delta || typeof delta !== 'object') return '-';
  const record = delta as Record<string, unknown>;
  if (typeof record.value === 'number') {
    if (record.value === 0) return 'No count change';
    return record.value > 0 ? `Increased by ${record.value}` : `Decreased by ${Math.abs(record.value)}`;
  }
  const added = Array.isArray(record.added) ? record.added.length : 0;
  const removed = Array.isArray(record.removed) ? record.removed.length : 0;
  if (added || removed) return `Added ${added}, removed ${removed}`;
  if (record.changed) return 'Text changed';
  return '-';
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatPositionDelta(delta?: number | null) {
  if (delta === null || delta === undefined) return 'No prior check';
  if (delta === 0) return 'No movement';
  const places = Math.abs(delta);
  return delta > 0 ? `Improved ${places} ${places === 1 ? 'place' : 'places'}` : `Dropped ${places} ${places === 1 ? 'place' : 'places'}`;
}

function buildCorrelationAssumption(page: CompetitorSnapshotRow, currentCapturedAt: string) {
  if (!page.previousCheck) return null;

  const movement = page.rankingHistory?.[0]?.positionDelta ?? null;
  if (movement === 0) return null;
  const diffs = (page.diffs ?? []).slice().sort((a, b) => b.severity - a.severity);
  const keywordRows = buildKeywordChangeRows(page, diffs);
  const elementRows = buildElementChangeRows(diffs);
  const evidenceRows = diffs.slice(0, 3).map((diff) => ({
    signal: humanizeField(diff.field),
    change: summarizeDelta(diff.delta),
    assumption: `${humanizeCategory(diff.category)} changed during the same check window.`,
    ...deltaExampleGroups(diff.delta),
    ...diffContext(diff),
  }));
  const window = `${formatDateTime(page.previousCheck.capturedAt)} to ${formatDateTime(currentCapturedAt)}`;
  const movementText = movement === null ? 'had no recorded rank delta' : formatPositionDelta(movement).toLowerCase();
  const severity = diffs.reduce((total, diff) => total + diff.severity, 0);
  const confidence = Math.min(85, Math.max(35, 40 + Math.min(30, Math.abs(movement ?? 0) * 5) + Math.min(15, Math.round(severity / 40))));

  return {
    assumptionType: 'ranking-content correlation',
    confidence,
    summary: `Between ${window}, this URL ${movementText}.`,
    structured: {
      window,
      movement: movementText,
      evidence: evidenceRows,
      keywords: keywordRows,
      elements: elementRows,
      caveat: 'Correlation assumption from the checked SERP position and stored page diffs only, not proof of causation.',
    },
  };
}

function buildSerpChangeConclusion(page: CompetitorSnapshotRow, keyword: string) {
  if (!page.previousCheck) return null;

  const movement = page.rankingHistory?.[0]?.positionDelta ?? null;
  if (movement === null || movement === undefined || movement === 0) return null;

  const diffs = page.diffs ?? [];
  const wordCount = diffs.find((diff) => diff.field === 'wordCount');
  const freshness = diffs.find((diff) => diff.field === 'freshnessSignals');
  const bonus = diffs.find((diff) => diff.field === 'bonusStructures');
  const anchors = diffs.find((diff) => diff.field === 'anchorTexts');
  const internalLinks = diffs.find((diff) => diff.field === 'internalLinksCount');
  const semantic = diffs.find((diff) => /keyword|phrase/i.test(diff.field));
  const usageRows = [...(page.extractedFeatures?.keywordUsageChange?.body ?? []), ...(page.extractedFeatures?.keywordUsageChange?.seo ?? [])].filter((row) => row.delta !== 0);
  const stableCore = [...(page.extractedFeatures?.keywordUsageChange?.body ?? []), ...(page.extractedFeatures?.keywordUsageChange?.seo ?? [])].filter(
    (row) => row.delta === 0 && /crypto casino|best crypto casino/i.test(row.phrase),
  );

  const movementText = movement > 0 ? `improved from #${page.previousCheck.position} to #${page.position}` : movement < 0 ? `dropped from #${page.previousCheck.position} to #${page.position}` : `stayed at #${page.position}`;
  const direction = movement > 0 ? 'increase' : movement < 0 ? 'decrease' : 'stability';
  const contentBits = [
    wordCount ? `content depth (${summarizeDelta(wordCount.delta).toLowerCase()})` : null,
    freshness ? `freshness signals (${summarizeDelta(freshness.delta).toLowerCase()})` : null,
    bonus ? `bonus wording (${summarizeDelta(bonus.delta).toLowerCase()})` : null,
    anchors ? `anchor text set (${summarizeDelta(anchors.delta).toLowerCase()})` : null,
    internalLinks ? `internal link count (${summarizeDelta(internalLinks.delta).toLowerCase()})` : null,
  ].filter(Boolean);
  const keywordBits = [
    semantic ? `semantic phrases (${summarizeDelta(semantic.delta).toLowerCase()})` : null,
    usageRows.length ? `${usageRows.length} keyword frequency shifts` : null,
    stableCore.length ? 'core crypto-casino terms mostly stayed stable' : null,
  ].filter(Boolean);

  const sentenceOne = `For "${keyword}", this URL ${movementText}, so the observed SERP ${direction} is most connected with ${contentBits.slice(0, 3).join(', ') || 'the measured page changes'}.`;
  const sentenceTwo = keywordBits.length
    ? `Keyword evidence looks supportive but not decisive: ${keywordBits.join(', ')}.`
    : 'Keyword evidence does not show a strong standalone driver in the stored diffs.';
  const sentenceThree =
    movement > 0
      ? 'Overall, the improvement correlates more with broader page refresh, coverage, and internal-context changes than with a simple exact-match keyword increase.'
      : movement < 0
        ? 'Overall, the drop correlates more with reduced or shifted page coverage and internal-context changes than with one isolated keyword edit.'
        : 'Overall, the stable ranking suggests the measured changes did not materially shift the page against this request during the checked window.';

  return `${sentenceOne} ${sentenceTwo} ${sentenceThree}`;
}

function buildKeywordChangeRows(page: CompetitorSnapshotRow, diffs: NonNullable<CompetitorSnapshotRow['diffs']>) {
  const rows: EvidenceRow[] = [];
  const phraseDiffs = diffs.filter((diff) => /keyword|phrase/i.test(diff.field));

  for (const diff of phraseDiffs.slice(0, 2)) {
    const detail = summarizeArrayDelta(diff.delta);
    if (!detail) continue;
    if (detail.added.length && detail.removed.length) {
      rows.push({
        signal: humanizeField(diff.field),
        change: `Added ${detail.added.length}, removed ${detail.removed.length}`,
        assumption: 'Topical relevance shifted rather than simply expanding coverage.',
        addedExamples: detail.added,
        removedExamples: detail.removed,
        ...diffContext(diff),
      });
    } else if (detail.added.length) {
      rows.push({
        signal: humanizeField(diff.field),
        change: `Added ${detail.added.length}`,
        assumption: 'Expanded phrase coverage can support movement when the additions match query intent.',
        addedExamples: detail.added,
        ...diffContext(diff),
      });
    } else if (detail.removed.length) {
      rows.push({
        signal: humanizeField(diff.field),
        change: `Removed ${detail.removed.length}`,
        assumption: 'Lost phrases may reduce relevance for those concepts while tightening focus elsewhere.',
        removedExamples: detail.removed,
        ...diffContext(diff),
      });
    }
  }

  const usageRows = [...(page.extractedFeatures?.keywordUsageChange?.body ?? []), ...(page.extractedFeatures?.keywordUsageChange?.seo ?? [])]
    .filter((row) => row.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  if (usageRows.length) {
    rows.push({
      signal: 'Usage frequency',
      change: `${usageRows.length} phrase frequencies changed`,
      assumption: 'Repeated terms can reinforce or reduce topical signals depending on target-query fit.',
      examples: usageRows.map((row) => `${row.delta > 0 ? '+' : '-'}${Math.abs(row.delta)} ${row.phrase}`),
    });
  }

  return rows.slice(0, 3);
}

function buildElementChangeRows(diffs: NonNullable<CompetitorSnapshotRow['diffs']>) {
  const rows: EvidenceRow[] = [];

  for (const diff of diffs.filter((item) => !/keyword|phrase/i.test(item.field)).slice(0, 4)) {
    const field = humanizeField(diff.field);

    if (diff.field === 'wordCount') {
      const value = numericDelta(diff.delta);
      if (value) {
        rows.push({
          signal: 'Content length',
          change: value > 0 ? `Increased by ${value} words` : `Decreased by ${Math.abs(value)} words`,
          assumption: 'Depth, coverage, and scannability changed in the same period.',
        });
      }
      continue;
    }

    if (/h\dCount|faqCount|tableCount|ctaCount|internalLinksCount/i.test(diff.field)) {
      const value = numericDelta(diff.delta);
      if (value) {
        rows.push({
          signal: field,
          change: value > 0 ? `Increased by ${value}` : `Decreased by ${Math.abs(value)}`,
          assumption: 'Page structure or available user paths changed in the same period.',
        });
      }
      continue;
    }

    const arrayDelta = summarizeArrayDelta(diff.delta);
    if (arrayDelta) {
      rows.push({
        signal: field,
        change: `Added ${arrayDelta.added.length}, removed ${arrayDelta.removed.length}`,
        assumption: 'Page emphasis changed beyond keyword wording.',
        addedExamples: arrayDelta.added,
        removedExamples: arrayDelta.removed,
        ...diffContext(diff),
      });
      continue;
    }

    if ((diff.delta as Record<string, unknown> | null)?.changed) {
      rows.push({
        signal: field,
        change: 'Text changed',
        assumption: 'The page may present relevance or trust differently.',
      });
    }
  }

  return rows.slice(0, 4);
}

function summarizeArrayDelta(delta: unknown) {
  if (!delta || typeof delta !== 'object') return null;
  const record = delta as Record<string, unknown>;
  const added = Array.isArray(record.added) ? record.added.filter((item): item is string => typeof item === 'string') : [];
  const removed = Array.isArray(record.removed) ? record.removed.filter((item): item is string => typeof item === 'string') : [];
  return added.length || removed.length ? { added, removed } : null;
}

function numericDelta(delta: unknown) {
  if (!delta || typeof delta !== 'object') return null;
  const value = (delta as Record<string, unknown>).value;
  return typeof value === 'number' && value !== 0 ? value : null;
}

function deltaExampleGroups(delta: unknown) {
  const arrayDelta = summarizeArrayDelta(delta);
  if (arrayDelta) return { addedExamples: arrayDelta.added, removedExamples: arrayDelta.removed };
  return {};
}

function diffContext(diff: NonNullable<CompetitorSnapshotRow['diffs']>[number]) {
  return {
    previousContext: contextValues(diff.previousValue),
    currentContext: contextValues(diff.currentValue),
  };
}

function contextValues(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  if (typeof value === 'number') return [String(value)];
  if (typeof value === 'boolean') return [value ? 'true' : 'false'];
  return [];
}

function humanizeField(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/\bseo\b/i, 'SEO')
    .replace(/\bh(\d) count\b/i, 'H$1 count')
    .trim();
}

function humanizeCategory(value: string) {
  return value.replace(/_/g, ' ');
}

function PhraseDeltaTable({ title, rows }: { title: string; rows: Array<{ phrase: string; current: number; previous: number; delta: number }> }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">{title}</p>
      {rows.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Phrase</th>
                <th className="px-3 py-2 text-left">Current</th>
                <th className="px-3 py-2 text-left">Previous</th>
                <th className="px-3 py-2 text-left">Delta</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 12).map((row) => (
                <tr key={`${title}-${row.phrase}`} className="border-t border-slate-800">
                  <td className="px-3 py-2 text-slate-200">{row.phrase}</td>
                  <td className="px-3 py-2 text-slate-300">{row.current}</td>
                  <td className="px-3 py-2 text-slate-500">{row.previous}</td>
                  <td className={row.delta > 0 ? 'px-3 py-2 text-emerald-300' : row.delta < 0 ? 'px-3 py-2 text-rose-300' : 'px-3 py-2 text-slate-500'}>{row.delta > 0 ? `+${row.delta}` : row.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No previous snapshot for this ranking URL yet.</p>
      )}
    </div>
  );
}
