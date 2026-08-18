/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { ordersApi } from '../api/orders';
import type { Order } from '../types';
import { FULFILLMENT_COLUMNS } from '../types';
import { OrderCard } from '../components/OrderCard';
import { ExceptionReportModal } from '../components/ExceptionReportModal';
import { DecisionAlert } from '../components/DecisionAlert';
import { eventsApi } from '../api/events';
import type { EventPayload, DecisionResponse } from '../types';
import { AlertTriangle } from 'lucide-react';
import { Toast, useToast } from '../components/Toast';

export function FulfillmentBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [decisionResult, setDecisionResult] = useState<DecisionResponse | null>(null);
  const { toasts, showToast, removeToast } = useToast();

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ordersApi.getOrders();
      setOrders(data);
    } catch (err) {
      setError('Failed to load orders. Please check if the backend is running.');
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleExceptionSubmit = async (payload: EventPayload) => {
    try {
      const result = await eventsApi.submitEvent(payload);
      setDecisionResult(result);
      await loadOrders();
    } catch (err) {
      console.error('Error submitting exception:', err);
      showToast(`Exception report failed: ${err instanceof Error ? err.message : 'Unable to submit the report.'}`, 'error');
      throw err;
    }
  };

  const getOrdersForColumn = (statuses: string[]) => {
    return orders.filter(order => statuses.includes(order.status));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading fulfillment board...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-red-600">{error}</div>
        <button
          onClick={loadOrders}
          className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Fulfillment Board</h1>
          <p className="text-sm text-zinc-600 mt-1">Track order progress through fulfillment stages</p>
        </div>
        <button
          onClick={() => setIsExceptionModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
        >
          <AlertTriangle className="w-4 h-4" />
          Report Issue
        </button>
      </div>
      
      {/* Decision Result Alert */}
      {decisionResult && (
        <DecisionAlert
          decisionMode={decisionResult.decision_mode}
          explanation={decisionResult.explanation}
          alternateBinSuggestion={decisionResult.alternate_bin_suggestion}
          onClose={() => setDecisionResult(null)}
        />
      )}
      
      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {FULFILLMENT_COLUMNS.map((column) => {
          const columnOrders = getOrdersForColumn(column.statuses);
          
          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-80 space-y-3"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">{column.title}</h2>
                <span className="text-xs text-zinc-500 font-mono">
                  {columnOrders.length}
                </span>
              </div>
              
              {/* Column Content */}
              <div className="space-y-3 min-h-[200px]">
                {columnOrders.length === 0 ? (
                  <div className="text-sm text-zinc-400 italic p-4 border border-dashed border-zinc-200 rounded-lg">
                    No orders
                  </div>
                ) : (
                  columnOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onTransitionSuccess={loadOrders}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Exception Report Modal */}
      <ExceptionReportModal
        isOpen={isExceptionModalOpen}
        onClose={() => setIsExceptionModalOpen(false)}
        onSubmit={handleExceptionSubmit}
      />
      {toasts.map(toast => <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />)}
    </div>
  );
}
