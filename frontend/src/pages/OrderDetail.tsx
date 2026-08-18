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
import { ArrowLeft, Play, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatPriorityScore, toNumber } from '../lib/utils';
import { Loader2 } from 'lucide-react';
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
      setTimeout(() => setActionError(null), 5000); // Clear error after 5 seconds
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
      
      // Update local state with API response
      setAllocationResult(result);
      showToast('Allocation completed.', 'success');
      
      // Reload order to get updated allocation state
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
      setTimeout(() => setActionError(null), 5000); // Clear error after 5 seconds
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
      // Reload order to get updated state
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
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading order details...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600 mb-4">{error || 'Order not found'}</div>
          <button
            onClick={() => navigate('/orders')}
            className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors"
          >
            Back to Orders
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 hover:bg-zinc-200 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 font-mono">{order.order_code}</h1>
            <p className="text-sm text-zinc-600 mt-1">{order.customer_name}</p>
          </div>
        </div>
        <button
          onClick={() => void loadOrder(order.id, true)}
          disabled={isSyncing || isAllocating}
          className="inline-flex items-center gap-2 rounded-md bg-zinc-200 px-3 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync current state'}
        </button>
      </div>

      {/* Action Error Alert */}
      {actionError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-red-800">{actionError}</p>
            {priorityRequired && (
              <button
                onClick={handlePrioritize}
                disabled={isPrioritizing || isAllocating || terminal || Boolean(order.priority_label)}
                className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {isPrioritizing ? 'Running...' : order.priority_label ? 'Priority Calculated' : 'Run Priority Check'}
              </button>
            )}
          </CardContent>
        </Card>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Order Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-600 mb-1">Status</p>
                  <Badge variant="active">{order.status}</Badge>
                </div>
                <div>
                  <p className="text-zinc-600 mb-1">Due Date</p>
                  <p className="font-mono text-xs">
                    {order.due_at ? formatDate(order.due_at) : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-600 mb-1">Risk Status</p>
                  {order.risk_status ? (
                    <Badge 
                      variant={
                        order.risk_status === 'Blocked' ? 'critical' : 
                        order.risk_status === 'At Risk' ? 'warning' : 'success'
                      }
                    >
                      {order.risk_status}
                    </Badge>
                  ) : (
                    <Badge variant="neutral">Safe</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left p-2 text-xs font-medium text-zinc-600 uppercase">
                        SKU ID
                      </th>
                      <th className="text-left p-2 text-xs font-medium text-zinc-600 uppercase">
                        Requested
                      </th>
                      <th className="text-left p-2 text-xs font-medium text-zinc-600 uppercase">
                        Allocated
                      </th>
                      <th className="text-left p-2 text-xs font-medium text-zinc-600 uppercase">
                        Unfulfilled
                      </th>
                      <th className="text-left p-2 text-xs font-medium text-zinc-600 uppercase">
                        Picked
                      </th>
                      <th className="text-left p-2 text-xs font-medium text-zinc-600 uppercase">
                        Dispatched
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id} className="border-b border-zinc-100">
                        <td className="p-2">
                          <span className="font-mono text-sm">{item.sku_id}</span>
                        </td>
                        <td className="p-2">
                          <span className="font-mono text-sm">{toNumber(item.quantity_requested)}</span>
                        </td>
                        <td className="p-2">
                          <span className="font-mono text-sm text-emerald-600">
                            {toNumber(item.quantity_allocated)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className="font-mono text-sm text-red-600">
                            {toNumber(item.quantity_requested) - toNumber(item.quantity_allocated)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className="font-mono text-sm">{toNumber(item.quantity_picked)}</span>
                        </td>
                        <td className="p-2">
                          <span className="font-mono text-sm">{toNumber(item.quantity_dispatched)}</span>
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                onClick={handlePrioritize}
                disabled={isPrioritizing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                {isPrioritizing ? 'Running...' : 'Run Priority Check'}
              </button>
              <button
                onClick={handleAllocate}
                disabled={isAllocating || isPrioritizing || terminal || !order.priority_score || ['Allocated', 'Ready to Pick', 'Picking', 'Picked', 'Packing', 'Quality Check', 'Ready to Dispatch', 'Dispatched'].includes(order.status)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                {isAllocating ? 'Running...' : 'Run Allocation'}
              </button>
              {(STATUS_ACTIONS[order.status] || []).map(action => (
                <button key={action.action} onClick={() => void handleTransition(action)} disabled={Boolean(isTransitioning) || isAllocating || isPrioritizing} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isTransitioning === action.action && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isTransitioning === action.action ? 'Processing...' : action.label}
                </button>
              ))}
              <button
                onClick={() => setIsExceptionModalOpen(true)}
                disabled={Boolean(terminal)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AlertTriangle className="w-4 h-4" />
                Report Issue
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Current inventory allocation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {relevantInventory.length === 0 ? (
                <p className="text-sm text-zinc-500">No inventory records found for this order&apos;s SKUs.</p>
              ) : relevantInventory.map(item => (
                <div key={item.sku_id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-mono text-zinc-700">{item.sku_code}</span>
                  <span className="text-right text-zinc-600">Allocated {item.allocated} · Available {item.available_stock}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Priority Score */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Priority Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold font-mono text-zinc-900">
                  {formatPriorityScore(order.priority_score)}
                </p>
                {order.priority_label && order.priority_score !== null && (
                  <Badge 
                    variant={order.priority_score >= 80 ? 'critical' : order.priority_score >= 60 ? 'warning' : 'neutral'}
                    className="mt-2"
                  >
                    {order.priority_label}
                  </Badge>
                )}
              </div>
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
