import { getSnapshots } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function SnapshotsPage() {
  const snapshots = await getSnapshots().catch(() => []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8">
        <h1 className="text-3xl font-semibold text-slate-100">Snapshots</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Capture page snapshots and historical diffs for your SEO content audit workflow.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Latest snapshots</CardTitle>
          <CardDescription>Content captures and crawl outputs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Captured</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((snapshot) => (
                <TableRow key={snapshot.id}>
                  <TableCell>{snapshot.page?.url || snapshot.id}</TableCell>
                  <TableCell>{snapshot.page?.domain || 'n/a'}</TableCell>
                  <TableCell>{new Date(snapshot.snapshotDate).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {snapshots.length === 0 ? <TableRow><TableCell colSpan={3} className="text-slate-500">No snapshots yet.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
