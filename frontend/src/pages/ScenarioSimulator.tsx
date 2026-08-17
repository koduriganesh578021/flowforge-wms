/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast, Toast } from '../components/Toast';
import { inventoryApi } from '../api/inventory';
import { ordersApi } from '../api/orders';
import { simulatorApi } from '../api/simulator';
import type { InventoryItem, Order } from '../types';
import { AlertTriangle, RefreshCw, Zap, Package, Scale } from 'lucide-react';

export function ScenarioSimulator() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, showToast, removeToast } = useToast();

  // Form states for each simulator action
  const [damageForm, setDamageForm] = useState({
    sku_id: '',
    location_id: '',
    quantity: '1',
  });
  const [countForm, setCountForm] = useState({
    sku_id: '',
    location_id: '',
    new_count: '',
  });
  const [qcForm, setQcForm] = useState({
    order_id: '',
    sku_id: '',
  });

  const [submitting, setSubmitting] = useState({
    damage: false,
    count: false,
    qc: false,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [inventoryData, ordersData] = await Promise.all([
        inventoryApi.getInventory(),
        ordersApi.getOrders(),
      ]);
      setInventory(inventoryData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading simulator data:', error);
      showToast('Failed to load inventory and orders data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDamageStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!damageForm.sku_id || !damageForm.location_id || !damageForm.quantity) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      setSubmitting({ ...submitting, damage: true });
      await simulatorApi.damageStock({
        sku_id: parseInt(damageForm.sku_id),
        location_id: parseInt(damageForm.location_id),
        quantity: parseInt(damageForm.quantity),
      });
      showToast('Stock damage reported successfully', 'success');
      setDamageForm({ sku_id: '', location_id: '', quantity: '1' });
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error reporting damaged stock:', error);
      showToast('Failed to report damaged stock', 'error');
    } finally {
      setSubmitting({ ...submitting, damage: false });
    }
  };

  const handleUpdateCount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countForm.sku_id || !countForm.location_id || !countForm.new_count) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      setSubmitting({ ...submitting, count: true });
      await simulatorApi.updateCount({
        sku_id: parseInt(countForm.sku_id),
        location_id: parseInt(countForm.location_id),
        new_count: parseInt(countForm.new_count),
      });
      showToast('Cycle count updated successfully', 'success');
      setCountForm({ sku_id: '', location_id: '', new_count: '' });
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error updating count:', error);
      showToast('Failed to update cycle count', 'error');
    } finally {
      setSubmitting({ ...submitting, count: false });
    }
  };

  const handleFailQc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcForm.order_id || !qcForm.sku_id) {
      showToast('Please select both an order and SKU', 'error');
      return;
    }

    try {
      setSubmitting({ ...submitting, qc: true });
      await simulatorApi.failQc({
        order_id: parseInt(qcForm.order_id),
        sku_id: parseInt(qcForm.sku_id),
      });
      showToast('QC failure simulated successfully', 'success');
      setQcForm({ order_id: '', sku_id: '' });
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error simulating QC failure:', error);
      showToast('Failed to simulate QC failure', 'error');
    } finally {
      setSubmitting({ ...submitting, qc: false });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500">
        Loading simulator data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Warehouse Reality Simulator</h1>
          <p className="text-sm text-zinc-600 mt-1">Control panel for triggering warehouse state changes</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => loadData()}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </Button>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Damage Stock Card */}
        <Card className="border-l-4 border-l-red-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Report Damaged Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDamageStock} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  SKU
                </label>
                <select
                  value={damageForm.sku_id}
                  onChange={(e) => setDamageForm({ ...damageForm, sku_id: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm font-mono"
                  required
                >
                  <option value="">Select SKU...</option>
                  {inventory.map((item) => (
                    <option key={item.sku_id} value={item.sku_id}>
                      {item.sku_code} - {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Location ID (Bin)
                </label>
                <input
                  type="number"
                  value={damageForm.location_id}
                  onChange={(e) => setDamageForm({ ...damageForm, location_id: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm font-mono"
                  placeholder="Enter location ID"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Damaged Quantity
                </label>
                <input
                  type="number"
                  value={damageForm.quantity}
                  onChange={(e) => setDamageForm({ ...damageForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm font-mono"
                  required
                  min="1"
                />
              </div>

              <Button
                type="submit"
                variant="danger"
                disabled={submitting.damage}
                className="w-full"
              >
                {submitting.damage ? 'Submitting...' : 'Report Damage'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Cycle Count Correction Card */}
        <Card className="border-l-4 border-l-amber-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="w-5 h-5 text-amber-600" />
              Cycle Count Correction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateCount} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  SKU
                </label>
                <select
                  value={countForm.sku_id}
                  onChange={(e) => setCountForm({ ...countForm, sku_id: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm font-mono"
                  required
                >
                  <option value="">Select SKU...</option>
                  {inventory.map((item) => (
                    <option key={item.sku_id} value={item.sku_id}>
                      {item.sku_code} - {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Location ID (Bin)
                </label>
                <input
                  type="number"
                  value={countForm.location_id}
                  onChange={(e) => setCountForm({ ...countForm, location_id: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm font-mono"
                  placeholder="Enter location ID"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  New Actual Count
                </label>
                <input
                  type="number"
                  value={countForm.new_count}
                  onChange={(e) => setCountForm({ ...countForm, new_count: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm font-mono"
                  placeholder="Enter new count"
                  required
                  min="0"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={submitting.count}
                className="w-full"
              >
                {submitting.count ? 'Updating...' : 'Update Count'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* QC Failure Card */}
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-blue-600" />
              Simulate QC Failure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFailQc} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Order ID
                </label>
                <select
                  value={qcForm.order_id}
                  onChange={(e) => setQcForm({ ...qcForm, order_id: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  required
                >
                  <option value="">Select Order...</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.order_code} - {order.customer_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  SKU
                </label>
                <select
                  value={qcForm.sku_id}
                  onChange={(e) => setQcForm({ ...qcForm, sku_id: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  required
                >
                  <option value="">Select SKU...</option>
                  {inventory.map((item) => (
                    <option key={item.sku_id} value={item.sku_id}>
                      {item.sku_code} - {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-xs text-blue-900">
                  <strong>Note:</strong> This will mark the order's inspection status as FAILED and trigger a QC_FAILED event.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={submitting.qc}
                className="w-full"
              >
                {submitting.qc ? 'Processing...' : 'Fail QC'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Current Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="w-5 h-5 text-zinc-600" />
            Current System State
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-zinc-50 rounded-md border border-zinc-200">
              <p className="text-xs text-zinc-600 font-medium">Total SKUs</p>
              <p className="text-lg font-bold font-mono text-zinc-900">{inventory.length}</p>
            </div>
            <div className="p-3 bg-zinc-50 rounded-md border border-zinc-200">
              <p className="text-xs text-zinc-600 font-medium">Active Orders</p>
              <p className="text-lg font-bold font-mono text-zinc-900">{orders.length}</p>
            </div>
            <div className="p-3 bg-zinc-50 rounded-md border border-zinc-200">
              <p className="text-xs text-zinc-600 font-medium">Damaged Items</p>
              <p className="text-lg font-bold font-mono text-red-600">
                {inventory.reduce((sum, item) => sum + item.damaged, 0)}
              </p>
            </div>
            <div className="p-3 bg-zinc-50 rounded-md border border-zinc-200">
              <p className="text-xs text-zinc-600 font-medium">Low Stock Items</p>
              <p className="text-lg font-bold font-mono text-amber-600">
                {inventory.filter((item) => item.status === 'High Risk' || item.status === 'Stockout').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
