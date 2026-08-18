/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useId, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { inventoryApi } from '../api/inventory';
import { ordersApi } from '../api/orders';
import { useSimulateEvent } from '../api/simulation';
import { Badge } from '../components/Badge';
import { Toast, useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import type { InventoryItem, Order, SimulateEventResponse, SimulateEventType } from '../types';
import { Cpu, Play, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';

const labels: Record<SimulateEventType, string> = {
  NEW_URGENT_ORDER: 'New Urgent Order (Rush)',
  ITEM_DAMAGED: 'Item Damaged in Bin',
  ITEM_MISSING: 'Item Missing / Discrepancy',
  QC_FAILURE: 'QC Failure at Inspection',
};

const inputClass =
  'w-full rounded-xl bg-[#16192b] border border-[#424769] px-3.5 py-2.5 text-xs text-white placeholder-[#9ba3c9] focus:border-[#f9b17a] focus:outline-none font-sans transition-colors';

type Form = {
  customer: string;
  sku: string;
  quantity: string;
  bin: string;
  order: string;
  dueAt: string;
  note: string;
};

export function SimulateEvent() {
  const [eventType, setEventType] = useState<SimulateEventType>('NEW_URGENT_ORDER');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState<Form>({
    customer: 'Acme Logistics VIP',
    sku: '',
    quantity: '5',
    bin: '1',
    order: '',
    dueAt: '',
    note: '',
  });
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [result, setResult] = useState<SimulateEventResponse | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const { simulateEvent, isPending } = useSimulateEvent();
  const { toasts, showToast, removeToast } = useToast();

  const baseId = useId();
  const eventTypeId = `${baseId}-event-type`;
  const customerId = `${baseId}-customer`;
  const skuId = `${baseId}-sku`;
  const quantityId = `${baseId}-quantity`;
  const binId = `${baseId}-bin`;
  const orderId = `${baseId}-order`;
  const dueAtId = `${baseId}-due-at`;
  const noteId = `${baseId}-note`;

  const stockEvent = eventType === 'ITEM_DAMAGED' || eventType === 'ITEM_MISSING';

  const loadOptions = useCallback(async () => {
    try {
      setOptionsLoading(true);
      setOptionsError(null);
      const [stock, orderData] = await Promise.all([
        inventoryApi.getInventory(),
        ordersApi.getOrders(),
      ]);
      setInventory(stock);
      setOrders(orderData);
      if (stock.length > 0 && !form.sku) {
        setForm((prev) => ({ ...prev, sku: String(stock[0].sku_id) }));
      }
    } catch (error) {
      console.error('Simulation options failed to load', error);
      setOptionsError(
        error instanceof Error ? error.message : 'Unable to load current SKUs and orders.'
      );
    } finally {
      setOptionsLoading(false);
    }
  }, [form.sku]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const set = (key: keyof Form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await simulateEvent({
        event_type: eventType,
        customer_name: eventType === 'NEW_URGENT_ORDER' ? form.customer.trim() : undefined,
        sku_id: eventType !== 'QC_FAILURE' ? Number(form.sku) : undefined,
        quantity: eventType !== 'QC_FAILURE' ? Number(form.quantity) : undefined,
        bin_id: stockEvent ? Number(form.bin) : undefined,
        order_id: eventType === 'QC_FAILURE' ? Number(form.order) : undefined,
        due_at:
          eventType === 'NEW_URGENT_ORDER' && form.dueAt
            ? new Date(form.dueAt).toISOString()
            : undefined,
        note: form.note.trim() || undefined,
      });
      setResult(response);
      showToast('Scenario simulation completed successfully.', 'success');
      setLiveAnnouncement(`Simulation finished: ${response.summary?.explanation ?? 'Outcome recorded.'}`);
      void loadOptions();
    } catch (error) {
      showToast(
        `Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  };

  const summary = result?.summary;
  const mode = summary?.decision_mode?.replaceAll('_', ' ');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Polite Live Announcement */}
      <div className="sr-only" aria-live="polite" role="status">
        {liveAnnouncement}
      </div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 font-heading">
            Scenario Simulator
            <Cpu className="w-6 h-6 text-[#f9b17a]" aria-hidden="true" />
          </h1>
          <p className="text-xs text-[#9ba3c9] mt-1 font-medium">
            Trigger real-time warehouse disruptions & inspect instant decision engine allocation changes
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void loadOptions()}
          disabled={optionsLoading}
          aria-label="Reload simulator options"
        >
          <RefreshCw className={`w-4 h-4 text-[#f9b17a] mr-1.5 ${optionsLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Reload Options
        </Button>
      </div>

      {/* Transparent Demo Environment & Decision Info */}
      <div className="p-3.5 rounded-xl bg-[#2d3250]/60 border border-[#424769]/50 text-xs text-[#d1d5db] flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-[#f9b17a] shrink-0" aria-hidden="true" />
        <span>
          <strong className="text-white">Demo environment:</strong> Change warehouse facts through the events below to observe how FlowForge recalculates inventory allocations, priority scores, and disruption recovery directives.
        </span>
      </div>

      {optionsError && (
        <div role="alert" aria-live="assertive" className="flex items-center justify-between rounded-2xl border border-amber-500/40 bg-amber-950/40 p-4 text-xs text-amber-300">
          <span>{optionsError}</span>
          <button type="button" onClick={() => void loadOptions()} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Main Simulation Control Card */}
      <Card className="glass-card">
        <CardHeader className="pb-3 border-b border-[#424769]/50">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#f9b17a]" aria-hidden="true" />
            Configure Scenario Event
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor={eventTypeId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5 font-heading">
                Event Type <span className="text-[#f9b17a]" aria-hidden="true">*</span>
                <span className="sr-only">(required)</span>
              </label>
              <select
                id={eventTypeId}
                className={inputClass}
                value={eventType}
                onChange={(e) => setEventType(e.target.value as SimulateEventType)}
                required
                aria-required="true"
              >
                {Object.entries(labels).map(([key, label]) => (
                  <option key={key} value={key} className="bg-[#16192b] text-white">
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {eventType === 'NEW_URGENT_ORDER' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={customerId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5 font-heading">
                    Customer Name <span className="text-[#f9b17a]" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    id={customerId}
                    className={inputClass}
                    required
                    aria-required="true"
                    value={form.customer}
                    onChange={(e) => set('customer', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor={skuId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5 font-heading">
                    Select SKU <span className="text-[#f9b17a]" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <select
                    id={skuId}
                    className={inputClass}
                    required
                    aria-required="true"
                    value={form.sku}
                    onChange={(e) => set('sku', e.target.value)}
                  >
                    <option value="" className="bg-[#16192b] text-[#9ba3c9]">
                      Select a SKU…
                    </option>
                    {inventory.map((item) => (
                      <option key={item.sku_id} value={item.sku_id} className="bg-[#16192b] text-white">
                        {item.sku_code} — {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={quantityId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5 font-heading">
                    Quantity <span className="text-[#f9b17a]" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    id={quantityId}
                    className={inputClass}
                    required
                    aria-required="true"
                    min="1"
                    type="number"
                    value={form.quantity}
                    onChange={(e) => set('quantity', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor={dueAtId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5 font-heading">
                    Due Target
                  </label>
                  <input
                    id={dueAtId}
                    className={inputClass}
                    type="datetime-local"
                    value={form.dueAt}
                    onChange={(e) => set('dueAt', e.target.value)}
                  />
                </div>
              </div>
            )}

            {stockEvent && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor={skuId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5 font-heading">
                    Select SKU <span className="text-[#f9b17a]" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <select
                    id={skuId}
                    className={inputClass}
                    required
                    aria-required="true"
                    value={form.sku}
                    onChange={(e) => set('sku', e.target.value)}
                  >
                    <option value="" className="bg-[#16192b] text-[#9ba3c9]">
                      Select a SKU…
                    </option>
                    {inventory.map((item) => (
                      <option key={item.sku_id} value={item.sku_id} className="bg-[#16192b] text-white">
                        {item.sku_code} — {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={binId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5 font-heading">
                    Bin Location ID <span className="text-[#f9b17a]" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    id={binId}
                    className={inputClass}
                    required
                    aria-required="true"
                    min="1"
                    type="number"
                    value={form.bin}
                    onChange={(e) => set('bin', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor={quantityId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5 font-heading">
                    Affected Quantity <span className="text-[#f9b17a]" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    id={quantityId}
                    className={inputClass}
                    required
                    aria-required="true"
                    min="1"
                    type="number"
                    value={form.quantity}
                    onChange={(e) => set('quantity', e.target.value)}
                  />
                </div>
              </div>
            )}

            {eventType === 'QC_FAILURE' && (
              <div>
                <label htmlFor={orderId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5 font-heading">
                  Target Open Order <span className="text-[#f9b17a]" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <select
                  id={orderId}
                  className={inputClass}
                  required
                  aria-required="true"
                  value={form.order}
                  onChange={(e) => set('order', e.target.value)}
                >
                  <option value="" className="bg-[#16192b] text-[#9ba3c9]">
                    Select an open order…
                  </option>
                  {orders
                    .filter((order) => !['Dispatched', 'Cancelled'].includes(order.status))
                    .map((order) => (
                      <option key={order.id} value={order.id} className="bg-[#16192b] text-white">
                        {order.order_code} — {order.customer_name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor={noteId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5 font-heading">
                Scenario Note (optional)
              </label>
              <textarea
                id={noteId}
                className={inputClass}
                rows={2}
                value={form.note}
                onChange={(e) => set('note', e.target.value)}
                placeholder="Add contextual notes for the decision engine log"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isPending}
                loading={isPending}
                aria-label="Run scenario simulation"
                prefix={<Play className="w-4 h-4 fill-[#16192b]" aria-hidden="true" />}
              >
                {isPending ? 'Running Simulation…' : 'Run Scenario Simulation'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Simulation Result Brief */}
      {summary && (
        <section aria-label="Simulation Outcome Brief">
          <Card className="glass-card border-[#f9b17a]/40 bg-[#2d3250]/90 shadow-2xl">
            <CardHeader className="pb-3 border-b border-[#424769]/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#f9b17a]" aria-hidden="true" />
                  Simulation Outcome Brief
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="active">{labels[result.event_type]}</Badge>
                  {mode && (
                    <Badge
                      variant={
                        summary.decision_mode === 'auto_executed' ||
                        summary.decision_mode === 'AUTO_EXECUTED'
                          ? 'success'
                          : summary.decision_mode === 'approval_required' ||
                            summary.decision_mode === 'APPROVAL_REQUIRED'
                          ? 'warning'
                          : 'critical'
                      }
                    >
                      Decision: {mode}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="rounded-xl border border-[#424769] bg-[#16192b] p-4 text-xs text-white leading-relaxed font-medium">
                {summary.explanation}
              </div>

              {summary.created_order_id && (
                <p className="text-xs text-[#d1d5db] font-mono">
                  Created Order <strong className="text-white">#{summary.created_order_id}</strong>
                  {summary.priority_label ? ` (${summary.priority_label})` : ''}.
                </p>
              )}

              {summary.new_order_status && (
                <p className="text-xs text-[#d1d5db] font-mono">
                  Updated Status: <strong className="text-[#f9b17a]">{summary.new_order_status}</strong>.
                </p>
              )}

              {summary.inventory_changes?.map((change, index) => (
                <p className="text-xs text-[#d1d5db] font-mono" key={`${change.sku_id}-${index}`}>
                  SKU #{change.sku_id}, Bin #{change.bin_id}:{' '}
                  <strong className="text-emerald-400">{change.before} → {change.after}</strong> ({change.field}).
                </p>
              ))}

              <div className="flex flex-wrap gap-4 border-t border-[#424769]/50 pt-3 text-xs font-bold text-[#f9b17a]">
                {summary.created_order_id && (
                  <Link
                    to={`/orders/${summary.created_order_id}`}
                    className="hover:underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#f9b17a] rounded p-1"
                  >
                    <span>View Order #{summary.created_order_id}</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </Link>
                )}
                {summary.affected_order_ids?.map((id) => (
                  <Link
                    key={id}
                    to={`/orders/${id}`}
                    className="hover:underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#f9b17a] rounded p-1"
                  >
                    <span>View Order #{id}</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </Link>
                ))}
                <Link to="/inventory" className="hover:underline focus-visible:ring-2 focus-visible:ring-[#f9b17a] rounded p-1">
                  View Inventory
                </Link>
                <Link to="/exceptions" className="hover:underline focus-visible:ring-2 focus-visible:ring-[#f9b17a] rounded p-1">
                  View Exceptions
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

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

