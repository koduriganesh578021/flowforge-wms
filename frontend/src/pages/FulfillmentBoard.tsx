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
import { AlertTriangle, RefreshCw, Truck } from 'lucide-react';
import { Toast, useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';

export function FulfillmentBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [decisionResult, setDecisionResult] = useState<DecisionResponse | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const { toasts, showToast, removeToast } = useToast();

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ordersApi.getOrders();
      setOrders(data);
      setLiveAnnouncement(`Fulfillment board updated. Loaded ${data.length} active orders.`);
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

  if (loading && orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center h-64 glass-card rounded-2xl" aria-busy="true">
          <div className="text-[#9ba3c9] font-mono flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#f9b17a]" aria-hidden="true" />
            Loading fulfillment board...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div role="alert" aria-live="assertive" className="p-6 border border-rose-500/40 bg-rose-950/40 rounded-2xl space-y-4">
          <div className="text-rose-300 font-semibold">{error}</div>
          <Button variant="danger" onClick={loadOrders}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

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
            Fulfillment Kanban Board
            <Truck className="w-6 h-6 text-[#f9b17a]" aria-hidden="true" />
          </h1>
          <p className="text-xs text-[#9ba3c9] mt-1 font-medium">
            Track and advance orders across fulfillment stages (Picking → QC → Packing → Dispatch)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={loadOrders}
            disabled={loading}
            aria-label="Refresh fulfillment board"
            className="gap-2 shrink-0 shadow-md"
          >
            <RefreshCw className={`w-4 h-4 text-[#f9b17a] ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh Board
          </Button>
          <Button
            variant="danger"
            onClick={() => setIsExceptionModalOpen(true)}
            aria-label="Report disruption or warehouse exception"
            prefix={<AlertTriangle className="w-4 h-4" aria-hidden="true" />}
          >
            Report Issue
          </Button>
        </div>
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
      
      {/* Kanban Board Layout */}
      <div
        className="flex gap-5 overflow-x-auto pb-6 scrollbar-thin"
        role="region"
        aria-label="Fulfillment stages Kanban board"
      >
        {FULFILLMENT_COLUMNS.map((column) => {
          const columnOrders = getOrdersForColumn(column.statuses);
          const laneId = `lane-${column.id}`;
          
          return (
            <section
              key={column.id}
              aria-labelledby={laneId}
              className="flex-shrink-0 w-80 space-y-3 bg-[#2d3250]/70 p-5 rounded-2xl border border-[#424769]/50 backdrop-blur-xl"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-[#424769]/50 pb-3">
                <h2 id={laneId} className="text-xs font-bold uppercase tracking-wider text-white font-heading">
                  {column.title}
                </h2>
                <span
                  aria-label={`${columnOrders.length} orders`}
                  className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#f9b17a]/20 text-[#f9b17a] border border-[#f9b17a]/30"
                >
                  {columnOrders.length}
                </span>
              </div>
              
              {/* Column Cards */}
              <div
                className="space-y-3 min-h-[300px]"
                tabIndex={0}
                aria-label={`${column.title} column orders`}
              >
                {columnOrders.length === 0 ? (
                  <div className="text-xs text-[#9ba3c9] italic p-6 border border-dashed border-[#424769]/60 rounded-xl text-center">
                    No orders in stage
                  </div>
                ) : (
                  <ul className="space-y-3" aria-label={`Orders in ${column.title}`}>
                    {columnOrders.map((order) => (
                      <li key={order.id}>
                        <OrderCard
                          order={order}
                          onTransitionSuccess={loadOrders}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
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

