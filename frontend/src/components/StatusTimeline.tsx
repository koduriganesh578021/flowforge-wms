import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import type { StatusTimelineEvent } from '../types';

interface StatusTimelineProps {
  events?: StatusTimelineEvent[];
}

export function StatusTimeline({ events }: StatusTimelineProps) {
  const hasEvents = events && events.length > 0;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Status Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {hasEvents ? (
          <div className="space-y-3">
            {events.map((event, index) => (
              <div key={index} className="flex gap-3 text-sm">
                <div className="font-mono text-xs text-zinc-500 w-32 shrink-0">
                  {formatDate(event.timestamp)}
                </div>
                <div className="flex-1">
                  <p className="text-zinc-900 font-medium">{event.status}</p>
                  {event.actor && (
                    <p className="text-xs text-zinc-500 mt-0.5">by {event.actor}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-zinc-500 italic">
            No status history available.
          </div>
        )}
      </CardContent>
    </Card>
  );
}