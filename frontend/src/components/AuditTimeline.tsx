import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

export function AuditTimeline() {
  // TODO: Replace with actual audit data from API
  // This is a placeholder as per requirements
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Audit Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-zinc-500 italic">
          Audit timeline will be populated with decision events and state changes.
        </div>
        <div className="mt-4 space-y-3">
          {/* Placeholder timeline items */}
          {[
            { time: 'Pending', event: 'System initialization', status: 'neutral' },
            { time: 'Pending', event: 'Order events will appear here', status: 'neutral' },
          ].map((item, index) => (
            <div key={index} className="flex gap-3 text-sm">
              <div className="font-mono text-xs text-zinc-500 w-24 shrink-0">
                {item.time}
              </div>
              <div className="flex-1">
                <p className="text-zinc-700">{item.event}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
