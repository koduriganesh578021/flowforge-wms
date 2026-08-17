import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export function Fulfillment() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Fulfillment</h1>
        <p className="text-sm text-zinc-600 mt-1">Picking, packing, and dispatch operations</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Fulfillment Board</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 italic">
            Kanban-style fulfillment board showing Ready to Pick → Picking → Packed → Quality Check → Ready to Dispatch → Dispatched stages.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
