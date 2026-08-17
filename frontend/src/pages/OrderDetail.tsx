import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { ordersApi } from '../api/orders';
import type { OrderDetail, AllocationResponse } from '../types';
import { Badge } from '../components/Badge';
import { DecisionCard } from '../components/DecisionCard';
import { AuditTimeline } from '../components/AuditTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowLeft, Play, CheckCircle } from 'lucide-react';
import { formatPriorityScore, toNumber } from '../lib/utils';

export function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [allocationResult, setAllocationResult] = useState<AllocationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [priorityRequired, setPriorityRequired] = useState(false);
  const [auditEvents, setAuditEvents] = useState<string[]>([]);

  useEffect(() => {
    if (orderId) {
      loadOrder(parseInt(orderId));
    }
  }, [orderId]);

  const loadOrder = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await ordersApi.getOrderById(id);
      setOrder(data);
    } catch (err) {
      setError('Failed to load order details. Please check if the backend is running.');
      console.error('Error loading order:', err);
    } finally {
      setLoading(false);
    }
  };

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
        await loadOrder(order.id);
      }
      
      console.log('Priority result:', result);
    } catch (err) {
      console.error('Error prioritizing order:', err);
      setActionError('Failed to run priority check. Please try again.');
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
      
      // Reload order to get updated allocation state
      await loadOrder(order.id);
      
      console.log('Allocation result:', result);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409 &&
          err.response.data?.detail === 'Priority must be calculated before inventory allocation.') {
        setPriorityRequired(true);
        setActionError('Priority calculation required before inventory allocation.');
        return;
      }
      console.error('Error allocating order:', err);
      setActionError('Failed to run allocation. Please try again.');
      setTimeout(() => setActionError(null), 5000); // Clear error after 5 seconds
    } finally {
      setIsAllocating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

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

      {/* Action Error Alert */}
      {actionError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-red-800">{actionError}</p>
            {priorityRequired && (
              <button
                onClick={handlePrioritize}
                disabled={isPrioritizing}
                className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {isPrioritizing ? 'Running...' : 'Run Priority Check'}
              </button>
            )}
          </CardContent>
        </Card>
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
                disabled={isAllocating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                {isAllocating ? 'Running...' : 'Run Allocation'}
              </button>
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

          {/* Audit Timeline */}
          <AuditTimeline events={auditEvents} />
        </div>
      </div>
    </div>
  );
}
