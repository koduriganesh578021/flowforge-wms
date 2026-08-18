/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import { SIMULATION_DATA_CHANGED_EVENT } from '../api/simulation';
import type { Order } from '../types';
import { Badge } from '../components/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Search, RefreshCw, ArrowUpRight, Clock, Package } from 'lucide-react';

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ordersApi.getOrders();
      setOrders(data);
      setLiveAnnouncement(`Orders loaded. Showing ${data.length} total orders.`);
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

  useEffect(() => {
    const refresh = () => { void loadOrders(); };
    window.addEventListener(SIMULATION_DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SIMULATION_DATA_CHANGED_EVENT, refresh);
  }, [loadOrders]);

  const getPriorityBadge = (priorityLabel: string | null, priorityScore: number | null) => {
    if (!priorityLabel || priorityScore === null) {
      return <Badge variant="neutral">Priority: None</Badge>;
    }
    
    if (priorityScore >= 80) return <Badge variant="critical">Priority: {priorityLabel}</Badge>;
    if (priorityScore >= 60) return <Badge variant="warning">Priority: {priorityLabel}</Badge>;
    return <Badge variant="neutral">Priority: {priorityLabel}</Badge>;
  };

  const getRiskBadge = (riskStatus: string | null) => {
    if (!riskStatus) return <Badge variant="success">Risk: Safe</Badge>;
    
    switch (riskStatus) {
      case 'Blocked':
        return <Badge variant="critical">Risk: Blocked</Badge>;
      case 'At Risk':
        return <Badge variant="warning">Risk: At Risk</Badge>;
      case 'Safe':
        return <Badge variant="success">Risk: Safe</Badge>;
      default:
        return <Badge variant="neutral">Risk: {riskStatus}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.order_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Polite announcement */}
      <div className="sr-only" aria-live="polite" role="status">
        {liveAnnouncement}
      </div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 font-heading">
            Orders & Allocation Workflow
            <Package className="w-6 h-6 text-[#f9b17a]" aria-hidden="true" />
          </h1>
          <p className="text-xs text-[#9ba3c9] mt-1 font-medium">
            Real-time customer fulfillment pipeline · select any order for bin allocation rationale
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={loadOrders}
          disabled={loading}
          aria-label="Refresh orders pipeline"
          className="gap-2 shrink-0 shadow-md"
        >
          <RefreshCw className={`w-4 h-4 text-[#f9b17a] ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh Pipeline
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-[#2d3250]/80 p-3 rounded-2xl border border-[#424769]/50 backdrop-blur-xl">
        <div className="relative flex-1">
          <label htmlFor="order-search" className="sr-only">
            Search orders by order code, customer name, or status
          </label>
          <Search className="w-4 h-4 text-[#9ba3c9] absolute left-3.5 top-3" aria-hidden="true" />
          <input
            id="order-search"
            type="text"
            placeholder="Search by order code, customer name, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#16192b] border border-[#424769] rounded-xl text-sm text-white placeholder-[#9ba3c9] focus:outline-none focus:border-[#f9b17a]/60 font-sans transition-colors"
          />
        </div>
        <div className="text-xs font-mono text-[#9ba3c9] px-3 hidden sm:block">
          Showing <span className="text-[#f9b17a] font-bold">{filteredOrders.length}</span> of {orders.length} orders
        </div>
      </div>

      {/* Main Content Table */}
      {loading && orders.length === 0 ? (
        <div className="flex items-center justify-center h-64 glass-card rounded-2xl" aria-busy="true">
          <div className="text-[#9ba3c9] font-mono flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#f9b17a]" aria-hidden="true" />
            Loading warehouse orders...
          </div>
        </div>
      ) : error ? (
        <div role="alert" aria-live="assertive">
          <Card className="border-rose-500/40 bg-rose-950/40 text-rose-200">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="text-rose-300 font-semibold">{error}</div>
              <Button variant="danger" onClick={loadOrders}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center text-[#9ba3c9]">
            No orders match your filter criteria.
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <caption className="sr-only">
                  Warehouse orders list with status, priority, risk level, and target due dates
                </caption>
                <thead>
                  <tr className="border-b border-[#424769]/60 bg-[#16192b]/80 text-[#9ba3c9] text-xs font-bold uppercase tracking-wider font-mono">
                    <th scope="col" className="p-4">Order Code</th>
                    <th scope="col" className="p-4">Customer</th>
                    <th scope="col" className="p-4">Status</th>
                    <th scope="col" className="p-4">Priority</th>
                    <th scope="col" className="p-4">Risk Level</th>
                    <th scope="col" className="p-4">Due Target</th>
                    <th scope="col" className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#424769]/40">
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-[#424769]/40 transition-colors group"
                    >
                      <td className="p-4">
                        <Link
                          to={`/orders/${order.id}`}
                          aria-label={`View order ${order.order_code} for ${order.customer_name}`}
                          className="font-mono text-sm font-bold text-white group-hover:text-[#f9b17a] transition-colors focus-visible:ring-2 focus-visible:ring-[#f9b17a] rounded p-1 inline-block"
                        >
                          {order.order_code}
                        </Link>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-medium text-[#d1d5db]">
                          {order.customer_name}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant="active" className="capitalize font-mono text-[11px]">
                          Status: {order.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {getPriorityBadge(order.priority_label, order.priority_score)}
                      </td>
                      <td className="p-4">
                        {getRiskBadge(order.risk_status)}
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-xs text-[#d1d5db] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#9ba3c9]" aria-hidden="true" />
                          {order.due_at ? formatDate(order.due_at) : 'Unscheduled'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          to={`/orders/${order.id}`}
                          aria-label={`View rationale for order ${order.order_code}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#f9b17a] hover:underline focus-visible:ring-2 focus-visible:ring-[#f9b17a] rounded px-2 py-1"
                        >
                          <span>View Rationale</span>
                          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

