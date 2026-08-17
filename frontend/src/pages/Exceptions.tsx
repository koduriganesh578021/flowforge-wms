import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export function Exceptions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Exceptions</h1>
        <p className="text-sm text-zinc-600 mt-1">Decision center and exception management</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Exception Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 italic">
            Exception queue with auto-executed, approval required, and manual review filters will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
