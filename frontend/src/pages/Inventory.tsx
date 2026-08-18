/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, PackagePlus, Boxes, RefreshCw, Layers } from 'lucide-react';
import { inventoryApi } from '../api/inventory';
import { SIMULATION_DATA_CHANGED_EVENT } from '../api/simulation';
import type { InventoryItem } from '../types';
import { Badge } from '../components/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const loadInventory = useCallback(() => {
    setLoading(true);
    setError(null);
    inventoryApi
      .getInventory()
      .then((data) => {
        setItems(data);
        setLiveAnnouncement(`Inventory loaded. ${data.length} SKUs in ledger.`);
      })
      .catch(() => {
        setError('Failed to load inventory. Please check if the backend is running.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    const refresh = () => {
      void inventoryApi.getInventory().then((data) => {
        setItems(data);
        setLiveAnnouncement('Inventory data updated.');
      }).catch(() => setError('Failed to refresh inventory.'));
    };
    window.addEventListener(SIMULATION_DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SIMULATION_DATA_CHANGED_EVENT, refresh);
  }, []);

  const atRisk = items.filter((item) => item.status === 'Stockout' || item.status === 'High Risk');

  const badge = (item: InventoryItem) =>
    item.status === 'Stockout' ? (
      <Badge variant="critical">Status: Stockout</Badge>
    ) : item.status === 'High Risk' ? (
      <Badge variant="warning">Status: High Risk</Badge>
    ) : item.status === 'Data Quality Issue' ? (
      <Badge variant="warning">Status: Data Quality</Badge>
    ) : (
      <Badge variant="success">Status: Optimal</Badge>
    );

  if (loading && items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex h-64 items-center justify-center glass-card rounded-2xl" aria-busy="true">
          <div className="text-[#9ba3c9] font-mono flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#f9b17a]" aria-hidden="true" />
            Loading warehouse inventory...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div role="alert" aria-live="assertive">
          <Card className="border-rose-500/40 bg-rose-950/40 text-rose-200">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="text-rose-300 font-semibold">{error}</div>
              <Button variant="danger" onClick={loadInventory}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Polite announcement */}
      <div className="sr-only" aria-live="polite" role="status">
        {liveAnnouncement}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 font-heading">
            Inventory & Bin Telemetry
            <Boxes className="w-6 h-6 text-[#f9b17a]" aria-hidden="true" />
          </h1>
          <p className="text-xs text-[#9ba3c9] mt-1 font-medium">
            Real-time stock monitoring, reorder alerts, and bin allocation status
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={loadInventory}
          disabled={loading}
          aria-label="Refresh stock inventory"
          className="gap-2 shrink-0 shadow-md"
        >
          <RefreshCw className={`w-4 h-4 text-[#f9b17a] ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh Stock
        </Button>
      </div>

      {/* Low-Stock Decisions Alert Card */}
      {atRisk.length > 0 && (
        <section aria-label="Stockout Risk and Replenishment Directives">
          <Card className="border-amber-500/40 bg-amber-950/20 glass-card">
            <CardHeader className="pb-3 border-b border-amber-500/20">
              <CardTitle className="flex items-center gap-2 text-amber-300 text-sm uppercase tracking-wider font-mono">
                <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" aria-hidden="true" />
                Stockout Risk & Replenishment Directives ({atRisk.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {atRisk.map((item) => (
                <div key={item.sku_id} className="rounded-xl border border-amber-500/30 bg-[#16192b] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono font-bold text-white text-base">{item.sku_code} - {item.name}</span>
                    {badge(item)}
                  </div>
                  <p className="mt-2 text-xs text-[#d1d5db] leading-relaxed">{item.explanation}</p>
                  <p className="mt-2.5 flex items-center gap-2 text-xs font-bold text-[#f9b17a] font-mono bg-[#f9b17a]/10 p-2.5 rounded-lg border border-[#f9b17a]/20">
                    <PackagePlus className="w-4 h-4 text-[#f9b17a] shrink-0" aria-hidden="true" />
                    Recommended Replenishment: {item.suggested_reorder ?? 'Requires reorder-point correction'} units
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Main Inventory Table */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b border-[#424769]/50 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#f9b17a]" aria-hidden="true" />
            Stock Ledger & Safety Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">
                Warehouse inventory stock ledger, on-hand, allocated, damaged, and available stock levels
              </caption>
              <thead>
                <tr className="border-b border-[#424769]/60 bg-[#16192b]/80 text-[#9ba3c9] text-xs font-bold uppercase tracking-wider font-mono">
                  {['SKU Code & Name', 'On-Hand', 'Allocated', 'Damaged', 'Available Stock', 'Reorder Point', 'Projected', 'Status'].map(
                    (heading) => (
                      <th key={heading} scope="col" className="p-4">
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#424769]/40">
                {items.map((item) => (
                  <tr key={item.sku_id} className="hover:bg-[#424769]/40 transition-colors">
                    <td className="p-4">
                      <div className="font-mono text-sm font-bold text-white">{item.sku_code}</div>
                      <div className="text-xs text-[#9ba3c9] mt-0.5">{item.name}</div>
                    </td>
                    <td className="p-4 font-mono text-sm text-[#d1d5db]">{item.on_hand}</td>
                    <td className="p-4 font-mono text-sm text-[#d1d5db]">{item.allocated}</td>
                    <td className="p-4 font-mono text-sm text-rose-400">{item.damaged}</td>
                    <td className="p-4 font-mono text-sm font-bold text-emerald-400">
                      {Math.max(0, item.available_stock)}
                      {item.available_stock < 0 && (
                        <span className="ml-2 text-xs font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                          Over-allocated
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-sm text-[#9ba3c9]">{item.reorder_point ?? '—'}</td>
                    <td className="p-4 font-mono text-sm text-[#d1d5db]">{item.projected_stock}</td>
                    <td className="p-4">{badge(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

