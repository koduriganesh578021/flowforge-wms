/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useId } from 'react';
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toasts, showToast, removeToast } = useToast();

  const baseId = useId();
  const damageSkuId = `${baseId}-damage-sku`;
  const damageLocationId = `${baseId}-damage-location`;
  const damageQuantityId = `${baseId}-damage-qty`;

  const countSkuId = `${baseId}-count-sku`;
  const countLocationId = `${baseId}-count-location`;
  const countNewCountId = `${baseId}-count-new`;

  const qcOrderId = `${baseId}-qc-order`;
  const qcSkuId = `${baseId}-qc-sku`;

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
      setLoadError(null);
      const [inventoryData, ordersData] = await Promise.all([
        inventoryApi.getInventory(),
        ordersApi.getOrders(),
      ]);
      setInventory(inventoryData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading simulator data:', error);
      const message = 'Unable to load simulator data. Check that the backend is running and try again.';
      setLoadError(message);
      showToast(message, 'error');
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
      await loadData();
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
        new_quantity: parseInt(countForm.new_count),
      });
      showToast('Cycle count updated successfully', 'success');
      setCountForm({ sku_id: '', location_id: '', new_count: '' });
      await loadData();
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
      await loadData();
    } catch (error) {
      console.error('Error simulating QC failure:', error);
      showToast('Failed to simulate QC failure', 'error');
    } finally {
      setSubmitting({ ...submitting, qc: false });
    }
  };

  const inputStyles = "w-full px-3.5 py-2.5 bg-[#16192b] border border-[#424769] text-white rounded-xl focus:outline-none focus:border-[#f9b17a] font-sans text-xs transition-colors";
  const labelStyles = "block text-xs font-bold text-white mb-1.5 uppercase tracking-wider font-heading";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 font-heading">
            Warehouse Reality Simulator
            <Zap className="w-6 h-6 text-[#f9b17a]" aria-hidden="true" />
          </h1>
          <p className="text-xs text-[#9ba3c9] mt-1 font-medium">Control panel for triggering warehouse state changes</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void loadData()}
          disabled={loading}
          aria-label="Refresh simulator data"
          className="gap-2 shrink-0 shadow-md"
        >
          <RefreshCw className={`w-4 h-4 text-[#f9b17a] ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh Data
        </Button>
      </div>

      {loadError && (
        <div role="alert" aria-live="assertive" className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-xs text-rose-200">
          <span>{loadError}</span>
          <Button variant="secondary" onClick={() => void loadData()} disabled={loading}>
            Try Again
          </Button>
        </div>
      )}

      {loading && !loadError && (
        <p className="text-xs text-[#9ba3c9] font-mono">Loading simulator telemetry...</p>
      )}

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Damage Stock Card */}
        <Card className="glass-card border-l-4 border-l-rose-500">
          <CardHeader className="pb-3 border-b border-[#424769]/50">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white font-heading">
              <AlertTriangle className="w-4 h-4 text-rose-400" aria-hidden="true" />
              Report Damaged Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleDamageStock} className="space-y-4">
              <div>
                <label htmlFor={damageSkuId} className={labelStyles}>
                  SKU <span className="text-[#f9b17a]" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <select
                  id={damageSkuId}
                  value={damageForm.sku_id}
                  onChange={(e) => setDamageForm({ ...damageForm, sku_id: e.target.value })}
                  className={inputStyles}
                  required
                  aria-required="true"
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
                <label htmlFor={damageLocationId} className={labelStyles}>
                  Location ID (Bin) <span className="text-[#f9b17a]" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <input
                  id={damageLocationId}
                  type="number"
                  value={damageForm.location_id}
                  onChange={(e) => setDamageForm({ ...damageForm, location_id: e.target.value })}
                  className={inputStyles}
                  placeholder="Enter location ID"
                  required
                  aria-required="true"
                  min="1"
                />
              </div>

              <div>
                <label htmlFor={damageQuantityId} className={labelStyles}>
                  Damaged Quantity <span className="text-[#f9b17a]" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <input
                  id={damageQuantityId}
                  type="number"
                  value={damageForm.quantity}
                  onChange={(e) => setDamageForm({ ...damageForm, quantity: e.target.value })}
                  className={inputStyles}
                  required
                  aria-required="true"
                  min="1"
                />
              </div>

              <Button
                type="submit"
                variant="danger"
                loading={submitting.damage}
                disabled={submitting.damage}
                aria-label="Report stock damage"
                className="w-full justify-center"
              >
                Report Damage
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Cycle Count Correction Card */}
        <Card className="glass-card border-l-4 border-l-amber-500">
          <CardHeader className="pb-3 border-b border-[#424769]/50">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white font-heading">
              <Scale className="w-4 h-4 text-amber-400" aria-hidden="true" />
              Cycle Count Correction
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleUpdateCount} className="space-y-4">
              <div>
                <label htmlFor={countSkuId} className={labelStyles}>
                  SKU <span className="text-[#f9b17a]" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <select
                  id={countSkuId}
                  value={countForm.sku_id}
                  onChange={(e) => setCountForm({ ...countForm, sku_id: e.target.value })}
                  className={inputStyles}
                  required
                  aria-required="true"
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
                <label htmlFor={countLocationId} className={labelStyles}>
                  Location ID (Bin) <span className="text-[#f9b17a]" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <input
                  id={countLocationId}
                  type="number"
                  value={countForm.location_id}
                  onChange={(e) => setCountForm({ ...countForm, location_id: e.target.value })}
                  className={inputStyles}
                  placeholder="Enter location ID"
                  required
                  aria-required="true"
                  min="1"
                />
              </div>

              <div>
                <label htmlFor={countNewCountId} className={labelStyles}>
                  New Actual Count <span className="text-[#f9b17a]" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <input
                  id={countNewCountId}
                  type="number"
                  value={countForm.new_count}
                  onChange={(e) => setCountForm({ ...countForm, new_count: e.target.value })}
                  className={inputStyles}
                  placeholder="Enter new count"
                  required
                  aria-required="true"
                  min="0"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={submitting.count}
                disabled={submitting.count}
                aria-label="Update inventory cycle count"
                className="w-full justify-center"
              >
                Update Count
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* QC Failure Card */}
        <Card className="glass-card border-l-4 border-l-blue-500">
          <CardHeader className="pb-3 border-b border-[#424769]/50">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white font-heading">
              <Zap className="w-4 h-4 text-blue-400" aria-hidden="true" />
              Simulate QC Failure
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleFailQc} className="space-y-4">
              <div>
                <label htmlFor={qcOrderId} className={labelStyles}>
                  Order ID <span className="text-[#f9b17a]" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <select
                  id={qcOrderId}
                  value={qcForm.order_id}
                  onChange={(e) => setQcForm({ ...qcForm, order_id: e.target.value })}
                  className={inputStyles}
                  required
                  aria-required="true"
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
                <label htmlFor={qcSkuId} className={labelStyles}>
                  SKU <span className="text-[#f9b17a]" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <select
                  id={qcSkuId}
                  value={qcForm.sku_id}
                  onChange={(e) => setQcForm({ ...qcForm, sku_id: e.target.value })}
                  className={inputStyles}
                  required
                  aria-required="true"
                >
                  <option value="">Select SKU...</option>
                  {inventory.map((item) => (
                    <option key={item.sku_id} value={item.sku_id}>
                      {item.sku_code} - {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-500/30">
                <p className="text-xs text-blue-200 leading-relaxed">
                  <strong>Note:</strong> Marks the order&apos;s inspection status as FAILED and triggers a QC_FAILED disruption event.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={submitting.qc}
                disabled={submitting.qc}
                aria-label="Submit simulated QC failure"
                className="w-full justify-center"
              >
                Fail QC
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Current Data Summary */}
      <Card className="glass-card">
        <CardHeader className="pb-3 border-b border-[#424769]/50">
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white font-heading">
            <Package className="w-4 h-4 text-[#f9b17a]" aria-hidden="true" />
            Current System State
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 bg-[#16192b] rounded-xl border border-[#424769]/50">
              <p className="text-xs text-[#9ba3c9] font-bold uppercase">Total SKUs</p>
              <p className="text-xl font-bold font-mono text-white mt-1">{inventory.length}</p>
            </div>
            <div className="p-3.5 bg-[#16192b] rounded-xl border border-[#424769]/50">
              <p className="text-xs text-[#9ba3c9] font-bold uppercase">Active Orders</p>
              <p className="text-xl font-bold font-mono text-white mt-1">{orders.length}</p>
            </div>
            <div className="p-3.5 bg-[#16192b] rounded-xl border border-[#424769]/50">
              <p className="text-xs text-[#9ba3c9] font-bold uppercase">Damaged Items</p>
              <p className="text-xl font-bold font-mono text-rose-400 mt-1">
                {inventory.reduce((sum, item) => sum + item.damaged, 0)}
              </p>
            </div>
            <div className="p-3.5 bg-[#16192b] rounded-xl border border-[#424769]/50">
              <p className="text-xs text-[#9ba3c9] font-bold uppercase">Low Stock Items</p>
              <p className="text-xl font-bold font-mono text-amber-400 mt-1">
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

