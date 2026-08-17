import { useEffect, useState } from 'react';
import { AlertTriangle, PackagePlus } from 'lucide-react';
import { inventoryApi } from '../api/inventory';
import type { InventoryItem } from '../types';
import { Badge } from '../components/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inventoryApi.getInventory().then(setItems).catch(() => {
      setError('Failed to load inventory. Please check if the backend is running.');
    }).finally(() => setLoading(false));
  }, []);

  const atRisk = items.filter((item) => item.status === 'Stockout' || item.status === 'High Risk');
  const badge = (item: InventoryItem) => item.status === 'Stockout'
    ? <Badge variant="critical">Stockout</Badge>
    : item.status === 'High Risk' ? <Badge variant="warning">High Risk</Badge>
    : item.status === 'Data Quality Issue' ? <Badge variant="warning">Data Quality</Badge>
    : <Badge variant="success">Low Risk</Badge>;

  if (loading) return <div className="flex h-64 items-center justify-center text-zinc-500">Loading inventory...</div>;
  if (error) return <Card><CardContent className="p-6 text-red-600">{error}</CardContent></Card>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Inventory</h1>
        <p className="text-sm text-zinc-600 mt-1">Stock monitoring and location management</p>
      </div>
      
      {atRisk.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader><CardTitle className="flex items-center gap-2 text-amber-950"><AlertTriangle size={20} />Low-stock decisions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {atRisk.map((item) => <div key={item.sku_id} className="rounded-md border border-amber-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono font-semibold">{item.sku_code}</span>{badge(item)}</div>
              <p className="mt-2 text-sm text-zinc-700">{item.explanation}</p>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-amber-900"><PackagePlus size={16} />Recommended replenishment: {item.suggested_reorder ?? 'Requires reorder-point correction'} units</p>
            </div>)}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-zinc-200 bg-zinc-50">
            {['SKU', 'On-Hand', 'Allocated', 'Damaged', 'Available', 'Reorder Point', 'Projected Stock', 'Status'].map((heading) => <th key={heading} className="p-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-600">{heading}</th>)}
          </tr></thead><tbody>{items.map((item) => <tr key={item.sku_id} className="border-b border-zinc-100">
            <td className="p-3"><div className="font-mono text-sm font-medium">{item.sku_code}</div><div className="text-xs text-zinc-500">{item.name}</div></td>
            <td className="p-3">{item.on_hand}</td><td className="p-3">{item.allocated}</td><td className="p-3">{item.damaged}</td><td className="p-3 font-semibold">{item.available_stock}</td><td className="p-3">{item.reorder_point ?? '—'}</td><td className="p-3">{item.projected_stock}</td><td className="p-3">{badge(item)}</td>
          </tr>)}</tbody></table></div>
        </CardContent>
      </Card>
    </div>
  );
}
