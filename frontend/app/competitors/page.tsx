import { getCompetitors } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CompetitorSnapshotEngine } from '@/features/competitors/components/CompetitorSnapshotEngine';

export default async function CompetitorsPage() {
  const competitors = await getCompetitors().catch(() => []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8">
        <h1 className="text-3xl font-semibold text-slate-100">Competitor tracking</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Capture top organic SERP competitors, crawl their ranking pages, and extract normalized intelligence snapshots.
        </p>
      </div>
      <CompetitorSnapshotEngine />
      <Card>
        <CardHeader>
          <CardTitle>Competitors</CardTitle>
          <CardDescription>Domains tracked against active SEO projects.</CardDescription>
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
              {competitors.map((competitor) => (
                <TableRow key={competitor.id}>
                  <TableCell>{competitor.name || 'Competitor'}</TableCell>
                  <TableCell>{competitor.domain}</TableCell>
                </TableRow>
              ))}
              {competitors.length === 0 ? <TableRow><TableCell colSpan={2} className="text-slate-500">No competitors yet.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
