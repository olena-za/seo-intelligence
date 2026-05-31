import { getKeywords } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function KeywordsPage() {
  const keywords = await getKeywords().catch(() => []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8">
        <h1 className="text-3xl font-semibold text-slate-100">Keyword analysis</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Track keyword performance, search intent signals, and keyword inventory in one central place.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tracked keywords</CardTitle>
          <CardDescription>Real keyword records from the backend.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Difficulty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keywords.map((keyword) => (
                <TableRow key={keyword.id}>
                  <TableCell>{keyword.keyword}</TableCell>
                  <TableCell>{keyword.intent || 'Unknown'}</TableCell>
                  <TableCell>{keyword.volume ?? 'n/a'}</TableCell>
                  <TableCell>{keyword.difficulty ?? 'n/a'}</TableCell>
                </TableRow>
              ))}
              {keywords.length === 0 ? <TableRow><TableCell colSpan={4} className="text-slate-500">No keywords yet.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
