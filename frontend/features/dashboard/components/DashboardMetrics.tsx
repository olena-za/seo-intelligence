import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardMetricsProps {
  title: string;
  value: number;
}

export function DashboardMetrics({ title, value }: DashboardMetricsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-slate-100">{value}</p>
        <p className="mt-2 text-sm text-slate-500">Operational metrics for your SEO program.</p>
      </CardContent>
    </Card>
  );
}
