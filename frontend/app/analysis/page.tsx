import { getAnalyses } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TestReportForm } from '@/features/analysis/components/TestReportForm';

export default async function AnalysisPage() {
  const analyses = await getAnalyses().catch(() => []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8">
        <h1 className="text-3xl font-semibold text-slate-100">Analysis</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Generate a live SEO intelligence report from SERP data, crawled page content, and OpenAI analysis.
        </p>
      </div>
      <TestReportForm />
      <Card>
        <CardHeader>
          <CardTitle>Latest analyses</CardTitle>
          <CardDescription>Stored AI analysis outputs and scoring.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Summary</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead>Trust</TableHead>
                <TableHead>Analyzed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyses.map((analysis) => (
                <TableRow key={analysis.id}>
                  <TableCell>{analysis.summary || 'No summary'}</TableCell>
                  <TableCell>{analysis.primaryIntent || 'Unknown'}</TableCell>
                  <TableCell>{analysis.trustScore}</TableCell>
                  <TableCell>{new Date(analysis.analyzedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {analyses.length === 0 ? <TableRow><TableCell colSpan={4} className="text-slate-500">No analyses yet.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
