import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getProjects } from '@/lib/api';
import { API_BASE_URL } from '@/lib/constants/env';
import { DashboardMetrics } from '@/features/dashboard/components/DashboardMetrics';
import { ActivityFeed } from '@/features/dashboard/components/ActivityFeed';
import { RecentJobs } from '@/features/dashboard/components/RecentJobs';

export default async function DashboardPage() {
  let projects = [];
  let error = '';

  try {
    projects = await getProjects();
  } catch {
    error = `Unable to load projects from ${API_BASE_URL}/projects. Dashboard metrics are unavailable until the backend is reachable.`;
  }

  const totalProjects = projects.length;
  const totalKeywords = 486;

  return (
    <div className="min-w-0 space-y-6">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <CardTitle>SEO Operations</CardTitle>
                  <CardDescription>Monitor keyword health, projects, and signal across your active sites.</CardDescription>
                </div>
                <Badge variant="accent" className="w-fit shrink-0">Internal tool</Badge>
              </div>
              {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
            </CardHeader>
            <CardContent>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                <DashboardMetrics title="Projects" value={totalProjects} />
                <DashboardMetrics title="Keywords" value={totalKeywords} />
                <DashboardMetrics title="Analyses" value={12} />
                <DashboardMetrics title="Snapshots" value={8} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Latest analyses</CardTitle>
                <Badge variant="secondary">Preview</Badge>
              </div>
              <CardDescription>Quick overview of recent semantic and competitive analysis jobs.</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityFeed />
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Recent snapshots</CardTitle>
              <CardDescription>Recent content snapshots and diff activity from tracked pages.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-500">Project</span>
                    <Badge variant="accent">2h ago</Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-100">Webopedia SEO</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Snapshot captured for content audit and SERP drift.</p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-500">Project</span>
                    <Badge variant="secondary">6h ago</Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-100">Competitor watch</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">SERP drift detected for target keyword set.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent jobs</CardTitle>
              <CardDescription>Pipeline activity for scheduled monitoring and analysis.</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentJobs />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
