import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export function Inventory() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Inventory</h1>
        <p className="text-sm text-zinc-600 mt-1">Stock monitoring and location management</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Inventory Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 italic">
            Inventory table with SKU, location, on-hand, allocated, damaged, and available stock will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
