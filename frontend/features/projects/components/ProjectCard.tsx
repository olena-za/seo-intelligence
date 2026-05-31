import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers } from 'lucide-react';
import type { Project } from '@/types/project';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card className="border-slate-800 bg-slate-950">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-sky-300">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription className="text-slate-500">ID: {project.id}</CardDescription>
            </div>
          </div>
          <Badge variant="accent">Live</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-400">
          SEO monitoring, SERP collection, and competitor signals for this project.
        </p>
      </CardContent>
    </Card>
  );
}
