import Link from 'next/link';
import { ArrowLeft, BarChart3, FileClock, Globe2, Search, ShieldCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  analysisScore,
  formatDate,
  getAnalyses,
  getCompetitors,
  getKeywords,
  getProject,
  getProjectIntelligence,
  getSerpSnapshots,
  getSnapshots,
} from '@/lib/api';
import { ProjectDeleteButton } from '@/features/projects/components/ProjectDeleteButton';
import { KeywordIntelligenceForm } from '@/features/intelligence/components/KeywordIntelligenceForm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Analysis, Competitor, IntelligenceProjectData, Keyword, PageSnapshot, SerpSnapshot } from '@/types/entities';

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let project;
  let keywords: Keyword[] = [];
  let competitors: Competitor[] = [];
  let snapshots: PageSnapshot[] = [];
  let analyses: Analysis[] = [];
  let serpSnapshots: SerpSnapshot[] = [];
  let intelligence: IntelligenceProjectData | null = null;

  try {
    project = await getProject(id);
    [keywords, competitors, snapshots, analyses, serpSnapshots, intelligence] = await Promise.all([
      getKeywords(id),
      getCompetitors(id),
      getSnapshots(id),
      getAnalyses(id),
      getSerpSnapshots(id),
      getProjectIntelligence(id),
    ]);
  } catch {
    return (
      <Card className="border-rose-900/60">
        <CardHeader>
          <CardTitle>Project unavailable</CardTitle>
          <CardDescription>
            Unable to load this project from the backend. Confirm the backend is running on port 3000.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
              Projects
            </Link>
          </Button>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Project details</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100">{project.name}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              {project.description || 'No project description has been added yet.'}
            </p>
          </div>
        </div>
        <ProjectDeleteButton projectId={project.id} redirectTo="/projects" />
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader>
            <CardTitle>Domain</CardTitle>
            <CardDescription>Primary site tracked by this project.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-slate-100">
              <Globe2 className="h-4 w-4 text-sky-300" />
              {project.domain ? <span>{project.domain}</span> : <span className="text-slate-500">Not set</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Created</CardTitle>
            <CardDescription>Workspace onboarding date.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-100">{formatDate(project.createdAt)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Current project monitoring state.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="accent">Live</Badge>
          </CardContent>
        </Card>

        <MetricCard title="Keywords" value={keywords.length} icon={Search} />
        <MetricCard title="Competitors" value={competitors.length} icon={ShieldCheck} />
        <MetricCard title="Snapshots" value={snapshots.length} icon={FileClock} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run keyword intelligence</CardTitle>
          <CardDescription>
            Enter one keyword to collect Google SERPs, crawl the top 5 ranking pages, and generate structured AI SEO analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KeywordIntelligenceForm projectId={project.id} />
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tracked keywords</CardTitle>
            <CardDescription>Keyword inventory connected to this project.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.slice(0, 6).map((keyword) => (
                  <TableRow key={keyword.id}>
                    <TableCell>{keyword.keyword}</TableCell>
                    <TableCell>{keyword.intent || 'Unknown'}</TableCell>
                    <TableCell>{keyword.volume ?? 'n/a'}</TableCell>
                  </TableRow>
                ))}
                {keywords.length === 0 ? <EmptyRow label="No keywords tracked yet." columns={3} /> : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Competitors</CardTitle>
            <CardDescription>Domains monitored for SERP and content movement.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Domain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitors.slice(0, 6).map((competitor) => (
                  <TableRow key={competitor.id}>
                    <TableCell>{competitor.name || 'Competitor'}</TableCell>
                    <TableCell>{competitor.domain}</TableCell>
                  </TableRow>
                ))}
                {competitors.length === 0 ? <EmptyRow label="No competitors tracked yet." columns={2} /> : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SERP competitors</CardTitle>
            <CardDescription>Latest organic results saved from DataForSEO.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pos</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Title</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(intelligence?.serpSnapshots[0]?.results ?? []).slice(0, 10).map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>{result.position}</TableCell>
                    <TableCell>{result.domain}</TableCell>
                    <TableCell>
                      <a href={result.url} className="text-slate-200 hover:text-sky-200" target="_blank" rel="noreferrer">
                        {result.title || result.url}
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
                {intelligence?.serpSnapshots[0]?.results?.length ? null : (
                  <EmptyRow label="Run a keyword to capture SERP competitors." columns={3} />
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analyzed pages</CardTitle>
            <CardDescription>Top ranking pages crawled with Firecrawl and analyzed by OpenAI.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Crawl</TableHead>
                  <TableHead>AI</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(intelligence?.crawledPages ?? []).slice(0, 8).map((page) => (
                  <TableRow key={page.id}>
                    <TableCell>
                      <div className="max-w-md truncate">
                        <a href={page.url} className="text-slate-200 hover:text-sky-200" target="_blank" rel="noreferrer">
                          {page.title || page.domain || page.url}
                        </a>
                      </div>
                      {page.error ? <p className="mt-1 text-xs text-rose-300">{page.error}</p> : null}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={page.status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={page.analysis?.status || 'pending'} />
                    </TableCell>
                    <TableCell>{analysisScore(page.analysis) ?? 'n/a'}</TableCell>
                  </TableRow>
                ))}
                {intelligence?.crawledPages.length ? null : (
                  <EmptyRow label="No pages crawled yet." columns={4} />
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analysis summaries</CardTitle>
          <CardDescription>Structured SEO intelligence from the latest analyzed pages.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(intelligence?.analyses ?? []).slice(0, 5).map((analysis) => (
              <div key={analysis.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-slate-100">{analysis.crawledPage?.title || analysis.crawledPage?.url || 'Analyzed page'}</p>
                  <StatusBadge status={analysis.status} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">{analysis.summary || analysis.error || 'No summary returned yet.'}</p>
                {analysis.opportunities?.length ? (
                  <p className="mt-2 text-sm text-sky-200">Opportunity: {analysis.opportunities[0]}</p>
                ) : null}
              </div>
            ))}
            {intelligence?.analyses.length ? null : <p className="text-sm text-slate-500">No AI analysis has been generated yet.</p>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <StatusCard
          title="Latest analyses"
          icon={BarChart3}
          count={analyses.length}
          description={analyses[0]?.summary || 'No AI analysis has been generated yet.'}
        />
        <StatusCard
          title="Latest snapshots"
          icon={FileClock}
          count={snapshots.length}
          description={snapshots[0]?.page?.url || 'No page snapshots have been captured yet.'}
        />
        <StatusCard
          title="SERP status"
          icon={Search}
          count={serpSnapshots.length}
          description={serpSnapshots[0]?.keyword?.keyword || 'No SERP collections have run yet.'}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <Badge variant="accent">Completed</Badge>;
  if (status === 'failed') return <Badge variant="destructive">Failed</Badge>;
  if (status === 'processing') return <Badge variant="secondary">Processing</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

function MetricCard({ title, value, icon: Icon }: { title: string; value: number; icon: typeof Search }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-sky-300" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-slate-100">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusCard({
  title,
  description,
  count,
  icon: Icon,
}: {
  title: string;
  description: string;
  count: number;
  icon: typeof Search;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-sky-300" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant={count > 0 ? 'accent' : 'secondary'}>{count > 0 ? `${count} recorded` : 'Waiting'}</Badge>
      </CardContent>
    </Card>
  );
}

function EmptyRow({ label, columns }: { label: string; columns: number }) {
  return (
    <TableRow>
      <TableCell colSpan={columns} className="text-slate-500">
        {label}
      </TableCell>
    </TableRow>
  );
}
