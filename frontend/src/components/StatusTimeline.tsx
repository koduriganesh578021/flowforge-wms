import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import type { StatusTimelineEvent } from '../types';

interface StatusTimelineProps {
  events?: StatusTimelineEvent[];
}

export function StatusTimeline({ events }: StatusTimelineProps) {
  const hasEvents = events && events.length > 0;

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '—';
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };
  
  return (
    <Card className="glass-card">
      <CardHeader className="pb-3 border-b border-[#424769]/50">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-white font-heading">
          Status History
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {hasEvents ? (
          <ol className="space-y-3" aria-label="Status transition history">
            {events.map((event, index) => (
              <li key={index} className="flex gap-3 text-xs font-mono">
                <span className="text-[#9ba3c9] w-28 shrink-0">
                  {formatDate(event.timestamp)}
                </span>
                <div className="flex-1">
                  <p className="text-white font-bold">{event.status}</p>
                  {event.actor && (
                    <p className="text-[11px] text-[#9ba3c9] mt-0.5 font-sans">by {event.actor}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-[#9ba3c9] italic">
            No status transition history recorded yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}