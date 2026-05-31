import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { formatDate, getProjects, type Project } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProjectCreateDialog } from '@/features/projects/components/ProjectCreateDialog';
import { ProjectDeleteButton } from '@/features/projects/components/ProjectDeleteButton';

export default async function ProjectsPage() {
  let projects: Project[] = [];
  let error = '';

  try {
    projects = await getProjects();
  } catch {
    error = 'Unable to load projects from http://localhost:3000/projects. Confirm the backend is running on port 3000.';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Projects</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-100">Active project tracking</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Track content, competitors, and keyword signal at the project level.
          </p>
        </div>
        <ProjectCreateDialog />
      </div>

      {error ? (
        <Card className="border-rose-900/60">
          <CardHeader>
            <CardTitle>Projects unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : projects.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium text-slate-100">{project.name}</p>
                    <p className="max-w-xl truncate text-xs text-slate-500">{project.description || 'No description yet.'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {project.domain ? <Badge variant="secondary">{project.domain}</Badge> : <span className="text-slate-500">Not set</span>}
                </TableCell>
                <TableCell className="text-slate-400">{formatDate(project.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/projects/${project.id}`}>
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </Link>
                    </Button>
                    <ProjectDeleteButton projectId={project.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No projects found</CardTitle>
            <CardDescription>
              Create your first project to populate this workspace.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Project summary</CardTitle>
          <CardDescription>Quick overview of active projects and operational priorities.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">
            Your projects list is stored on the backend and can be extended with new SEO initiatives as you onboard new domains or content campaigns.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
