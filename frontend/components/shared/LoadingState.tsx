import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface LoadingStateProps {
  rows?: number;
}

export function LoadingState({ rows = 3 }: LoadingStateProps) {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-44 rounded-lg bg-slate-800" />
        <div className="h-4 w-80 max-w-full rounded-lg bg-slate-900" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="h-16 rounded-2xl border border-slate-800 bg-slate-950" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
