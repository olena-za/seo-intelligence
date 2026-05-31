import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const activities = [
  { title: 'Semantic analysis completed', detail: 'AI entity extraction ready for Webopedia SEO.', badge: 'Live' },
  { title: 'SERP snapshot collected', detail: 'Top 10 rankings captured for target keywords.', badge: 'Info' },
  { title: 'Competitor audit queued', detail: 'Next run scheduled for 02:00 UTC.', badge: 'Queued' },
];

export function ActivityFeed() {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.title} className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-100">{activity.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{activity.detail}</p>
            </div>
            <Badge variant={activity.badge === 'Live' ? 'accent' : activity.badge === 'Queued' ? 'secondary' : 'default'}>
              {activity.badge}
            </Badge>
          </div>
          <Separator className="my-4" />
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Operational note</p>
        </div>
      ))}
    </div>
  );
}
