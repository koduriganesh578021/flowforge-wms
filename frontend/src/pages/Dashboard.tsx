import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Command Center</h1>
        <p className="text-sm text-zinc-600 mt-1">Operations overview and action queue</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Orders', value: '0', color: 'text-zinc-900' },
          { label: 'Critical Orders', value: '0', color: 'text-red-600' },
          { label: 'Low Stock SKUs', value: '0', color: 'text-amber-600' },
          { label: 'Exceptions', value: '0', color: 'text-zinc-600' },
        ].map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-4">
              <p className="text-xs text-zinc-600 mb-1">{metric.label}</p>
              <p className={`text-2xl font-bold font-mono ${metric.color}`}>{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 italic">
            Action recommendations will appear here based on operational state.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
