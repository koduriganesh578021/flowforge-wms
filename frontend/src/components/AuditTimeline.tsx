import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

interface AuditTimelineProps {
  events?: string[];
}

export function AuditTimeline({ events }: AuditTimelineProps) {
  const hasEvents = events && events.length > 0;
  
  return (
    <Card className="glass-card">
      <CardHeader className="pb-3 border-b border-[#424769]/50">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-white font-heading">
          Audit Decision Trail
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {hasEvents ? (
          <ol className="space-y-3" aria-label="Audit decision step sequence">
            {events.map((event, index) => (
              <li key={index} className="flex gap-3 text-xs font-mono">
                <span className="text-[#f9b17a] font-bold w-16 shrink-0">
                  Step {index + 1}
                </span>
                <span className="flex-1 text-[#d1d5db] font-sans">
                  {event}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-[#9ba3c9] italic">
            Audit decision events will appear here once priority or allocation calculation executes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

