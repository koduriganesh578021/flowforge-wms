/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersApi, OrdersApiError } from '../api/orders';
import { eventsApi } from '../api/events';
import { inventoryApi } from '../api/inventory';
import type { OrderDetail, AllocationResponse, EventPayload, DecisionResponse, InventoryItem, StatusAction } from '../types';
import { STATUS_ACTIONS } from '../types';
import { Badge } from '../components/Badge';
import { DecisionCard } from '../components/DecisionCard';
import { AuditTimeline } from '../components/AuditTimeline';
import { StatusTimeline } from '../components/StatusTimeline';
import { ExceptionReportModal } from '../components/ExceptionReportModal';
import { DecisionAlert } from '../components/DecisionAlert';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Play, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatPriorityScore, toNumber } from '../lib/utils';
import { Toast, useToast } from '../components/Toast';

function getActionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof OrdersApiError && error.message.trim()) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [allocationResult, setAllocationResult] = useState<AllocationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [priorityRequired, setPriorityRequired] = useState(false);
  const [auditEvents, setAuditEvents] = useState<string[]>([]);
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [decisionResult, setDecisionResult] = useState<DecisionResponse | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<string | null>(null);
  const { toasts, showToast, removeToast } = useToast();
  const terminal = order?.status === 'Dispatched' || order?.status === 'Cancelled';

  const loadOrder = useCallback(async (id: number, background = false) => {
    try {
      if (background) setIsSyncing(true);
      else setLoading(true);
      setError(null);
      const [orderData, inventoryData] = await Promise.all([
        ordersApi.getOrderById(id),
        inventoryApi.getInventory(),
      ]);
      setOrder(orderData);
      setInventory(inventoryData);
    } catch (err) {
      setError('Failed to load order details. Please check if the backend is running.');
      console.error('Error loading order:', err);
    } finally {
      if (background) setIsSyncing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (orderId) {
      loadOrder(parseInt(orderId));
    }
  }, [orderId, loadOrder]);

  const handlePrioritize = async () => {
    if (!order) return;
    
    try {
      setIsPrioritizing(true);
      setActionError(null);
      const result = await ordersApi.prioritizeOrder(order.id);
      
      if (result) {
        setOrder(prev => prev ? {
          ...prev,
          priority_score: result.score,
          priority_label: result.label,
          risk_status: result.risk_flag,
          priority_explanation: {
            score: result.score,
            label: result.label,
            risk_flag: result.risk_flag,
            reasons: result.reasons,
          },
        } : null);
        setAuditEvents(result.reasons);
        setPriorityRequired(false);
        await loadOrder(order.id, true);
        showToast('Priority check completed.', 'success');
      }
      
    } catch (err) {
      console.error('Error prioritizing order:', err);
      setActionError(getActionErrorMessage(err, 'Failed to run priority check. Please try again.'));
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setIsPrioritizing(false);
    }
  };

  const handleAllocate = async () => {
    if (!order) return;
    
    try {
      setIsAllocating(true);
      setActionError(null);
      const result = await ordersApi.allocateOrder(order.id);
      
      setAllocationResult(result);
      showToast('Allocation completed.', 'success');
      
      await loadOrder(order.id, true);
      
    } catch (err) {
      if (err instanceof OrdersApiError && err.status === 400 &&
          err.message === 'Priority must be calculated before inventory allocation.') {
        setPriorityRequired(true);
        setActionError(getActionErrorMessage(err, 'Priority calculation required before inventory allocation.'));
        return;
      }
      console.error('Error allocating order:', err);
      setActionError(getActionErrorMessage(err, 'Failed to run allocation. Please try again.'));
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setIsAllocating(false);
    }
  };

  const handleTransition = async (action: StatusAction) => {
    if (!order) return;
    try {
      setIsTransitioning(action.action);
      const targetByAction: Record<string, Parameters<typeof ordersApi.transitionOrder>[1]> = {
        start_picking: 'Picking', confirm_picked: 'Picked', confirm_packed: 'Packing',
        send_to_qc: 'Quality Check', qc_pass: 'Ready to Dispatch', qc_fail: 'Rework Required', dispatch: 'Dispatched',
      };
      await ordersApi.transitionOrder(order.id, targetByAction[action.action]);
      await loadOrder(order.id, true);
      showToast(`${action.label} successful.`, 'success');
    } catch (error) {
      showToast(`Transition not allowed: ${getActionErrorMessage(error, 'The order cannot move to the next stage.')}`, 'error');
    } finally { setIsTransitioning(null); }
  };

  const handleExceptionSubmit = async (payload: EventPayload) => {
    try {
      const result = await eventsApi.submitEvent(payload);
      setDecisionResult(result);
      if (order) {
        await loadOrder(order.id, true);
      }
    } catch (err) {
      console.error('Error submitting exception:', err);
      setActionError(getActionErrorMessage(err, 'Failed to submit exception report. Please try again.'));
      setTimeout(() => setActionError(null), 5000);
      throw err;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const relevantInventory = inventory.filter(item => order?.items.some(orderItem => orderItem.sku_id === item.sku_id));

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center h-64 glass-card rounded-2xl" aria-busy="true">
          <div className="text-[#9ba3c9] font-mono flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#f9b17a]" aria-hidden="true" />
            Loading order details...
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div role="alert" aria-live="assertive">
          <Card className="border-rose-500/40 bg-rose-950/40 text-rose-200">
            <CardContent className="p-6">
              <div className="text-rose-300 font-semibold mb-4">{error || 'Order not found'}</div>
              <Button
                variant="secondary"
                onClick={() => navigate('/orders')}
                aria-label="Return to orders list"
              >
                Back to Orders
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            aria-label="Back to orders list"
            className="p-2.5 bg-[#2d3250] hover:bg-[#424769] border border-[#424769] text-white rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#f9b17a]"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-mono flex items-center gap-2">
              Order {order.order_code}
            </h1>
            <p className="text-xs text-[#9ba3c9] mt-0.5 font-medium">{order.customer_name}</p>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => void loadOrder(order.id, true)}
          disabled={isSyncing || isAllocating}
          aria-label={`Sync state for order ${order.order_code}`}
          className="text-xs"
        >
          <RefreshCw className={`w-4 h-4 text-[#f9b17a] mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isSyncing ? 'Syncing...' : 'Sync state'}
        </Button>
      </div>

      {/* Action Error Alert */}
      {actionError && (
        <div role="alert" aria-live="assertive">
          <Card className="border-rose-500/40 bg-rose-950/40 text-rose-200">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-rose-300">{actionError}</p>
              {priorityRequired && (
                <button
                  type="button"
                  onClick={handlePrioritize}
                  disabled={isPrioritizing || isAllocating || terminal || Boolean(order.priority_label)}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-[#f9b17a] text-[#16192b] font-bold rounded-xl hover:bg-[#fa9d58] transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-[#16192b]" aria-hidden="true" />
                  {isPrioritizing ? 'Running...' : order.priority_label ? 'Priority Calculated' : 'Run Priority Check'}
                </button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Decision Result Alert */}
      {decisionResult && (
        <DecisionAlert
          decisionMode={decisionResult.decision_mode}
          explanation={decisionResult.explanation}
          alternateBinSuggestion={decisionResult.alternate_bin_suggestion}
          onClose={() => setDecisionResult(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Information */}
          <Card className="glass-card">
            <CardHeader className="pb-3 border-b border-[#424769]/50">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-white font-heading">
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <p className="text-[#9ba3c9] mb-1 uppercase font-bold text-[10px]">Status</p>
                  <Badge variant="active">Status: {order.status}</Badge>
                </div>
                <div>
                  <p className="text-[#9ba3c9] mb-1 uppercase font-bold text-[10px]">Due Date</p>
                  <p className="text-white font-bold">
                    {order.due_at ? formatDate(order.due_at) : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-[#9ba3c9] mb-1 uppercase font-bold text-[10px]">Risk Status</p>
                  {order.risk_status ? (
                    <Badge 
                      variant={
                        order.risk_status === 'Blocked' ? 'critical' : 
                        order.risk_status === 'At Risk' ? 'warning' : 'success'
                      }
                    >
                      Risk: {order.risk_status}
                    </Badge>
                  ) : (
                    <Badge variant="neutral">Risk: Safe</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items Table */}
          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#424769]/50">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-white font-heading">
                Order SKU Line Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <caption className="sr-only">
                    Order line items with requested, allocated, unfulfilled, picked, and dispatched quantities
                  </caption>
                  <thead>
                    <tr className="border-b border-[#424769]/60 bg-[#16192b]/80 text-[#9ba3c9] text-xs font-bold uppercase tracking-wider font-mono">
                      <th scope="col" className="p-3">SKU ID</th>
                      <th scope="col" className="p-3">Requested</th>
                      <th scope="col" className="p-3">Allocated</th>
                      <th scope="col" className="p-3">Unfulfilled</th>
                      <th scope="col" className="p-3">Picked</th>
                      <th scope="col" className="p-3">Dispatched</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#424769]/40 text-xs font-mono">
                    {order.items.map((item) => (
                      <tr key={item.id} className="hover:bg-[#424769]/30 transition-colors">
                        <td className="p-3">
                          <strong className="text-white">#{item.sku_id}</strong>
                        </td>
                        <td className="p-3 text-white font-bold">
                          {toNumber(item.quantity_requested)}
                        </td>
                        <td className="p-3 text-emerald-400 font-bold">
                          {toNumber(item.quantity_allocated)}
                        </td>
                        <td className="p-3 text-rose-400 font-bold">
                          {toNumber(item.quantity_requested) - toNumber(item.quantity_allocated)}
                        </td>
                        <td className="p-3 text-white">
                          {toNumber(item.quantity_picked)}
                        </td>
                        <td className="p-3 text-white">
                          {toNumber(item.quantity_dispatched)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Decision Card */}
          {allocationResult && (
            <DecisionCard 
              allocation={allocationResult}
              priority={order.priority_explanation}
            />
          )}
        </div>

        {/* Sidebar Actions & History */}
        <div className="space-y-6">
          {/* Actions */}
          <Card className="glass-card">
            <CardHeader className="pb-3 border-b border-[#424769]/50">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-white font-heading">
                Operational Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <Button
                variant="secondary"
                onClick={handlePrioritize}
                disabled={isPrioritizing}
                aria-label={`Run priority calculation for order ${order.order_code}`}
                className="w-full justify-center"
              >
                <Play className="w-4 h-4 text-[#f9b17a]" aria-hidden="true" />
                {isPrioritizing ? 'Running...' : 'Run Priority Check'}
              </Button>
              <Button
                variant="primary"
                onClick={handleAllocate}
                disabled={isAllocating || isPrioritizing || terminal || !order.priority_score || ['Allocated', 'Ready to Pick', 'Picking', 'Picked', 'Packing', 'Quality Check', 'Ready to Dispatch', 'Dispatched'].includes(order.status)}
                aria-label={`Run automated inventory allocation for order ${order.order_code}`}
                className="w-full justify-center"
              >
                <CheckCircle className="w-4 h-4 fill-[#16192b]" aria-hidden="true" />
                {isAllocating ? 'Running...' : 'Run Allocation'}
              </Button>
              {(STATUS_ACTIONS[order.status] || []).map(action => (
                <Button
                  key={action.action}
                  variant={action.variant}
                  loading={isTransitioning === action.action}
                  onClick={() => void handleTransition(action)}
                  disabled={Boolean(isTransitioning) || isAllocating || isPrioritizing}
                  aria-label={`${action.label} for order ${order.order_code}`}
                  className="w-full justify-center"
                >
                  {action.label}
                </Button>
              ))}
              <Button
                variant="danger"
                onClick={() => setIsExceptionModalOpen(true)}
                disabled={Boolean(terminal)}
                aria-label={`Report disruption or exception for order ${order.order_code}`}
                className="w-full justify-center"
              >
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                Report Disruption / Issue
              </Button>
            </CardContent>
          </Card>

          {/* Current Inventory Allocation */}
          <Card className="glass-card">
            <CardHeader className="pb-3 border-b border-[#424769]/50">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-white font-heading">
                SKU Inventory Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              {relevantInventory.length === 0 ? (
                <p className="text-xs text-[#9ba3c9] italic">No inventory records found for this order&apos;s SKUs.</p>
              ) : relevantInventory.map(item => (
                <div key={item.sku_id} className="flex items-center justify-between gap-3 text-xs font-mono p-2 rounded-lg bg-[#16192b] border border-[#424769]/50">
                  <span className="text-white font-bold">{item.sku_code}</span>
                  <span className="text-right text-[#d1d5db]">
                    Alloc: <strong className="text-emerald-400">{item.allocated}</strong> · Avail: <strong className="text-white">{item.available_stock}</strong>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Priority Score */}
          <Card className="glass-card">
            <CardHeader className="pb-3 border-b border-[#424769]/50">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-white font-heading">
                Priority Score
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-center">
              <p className="text-4xl font-extrabold font-mono text-white">
                {formatPriorityScore(order.priority_score)}
              </p>
              {order.priority_label && order.priority_score !== null && (
                <div className="mt-2">
                  <Badge 
                    variant={order.priority_score >= 80 ? 'critical' : order.priority_score >= 60 ? 'warning' : 'neutral'}
                  >
                    Priority: {order.priority_label}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <StatusTimeline events={order.status_history} />
          
          {/* Audit Timeline */}
          <AuditTimeline events={auditEvents} />
        </div>
      </div>

      {/* Exception Report Modal */}
      <ExceptionReportModal
        isOpen={isExceptionModalOpen}
        onClose={() => setIsExceptionModalOpen(false)}
        onSubmit={handleExceptionSubmit}
        defaultOrderId={order?.id}
      />
      {toasts.map(toast => <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />)}
    </div>
  );
}

