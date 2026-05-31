import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const recentJobs = [
  { job: 'Keyword scrape', status: 'Completed', project: 'Webopedia SEO', time: '1h ago' },
  { job: 'Content snapshot', status: 'In progress', project: 'HealthGuide', time: '2h ago' },
  { job: 'SERP capture', status: 'Queued', project: 'TravelPlus', time: '4h ago' },
];

export function RecentJobs() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Job</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recentJobs.map((job) => (
          <TableRow key={job.job}>
            <TableCell>{job.job}</TableCell>
            <TableCell>{job.project}</TableCell>
            <TableCell>
              <Badge variant={job.status === 'Completed' ? 'accent' : job.status === 'In progress' ? 'secondary' : 'default'}>
                {job.status}
              </Badge>
            </TableCell>
            <TableCell>{job.time}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
