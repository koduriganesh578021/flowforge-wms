import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import type { Order } from '../types';
import { Badge } from '../components/Badge';
import { Card, CardContent } from '../components/ui/Card';

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
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
  };

  const getPriorityBadge = (priorityLabel: string | null, priorityScore: number | null) => {
    if (!priorityLabel || priorityScore === null) {
      return <Badge variant="neutral">Not Prioritized</Badge>;
    }
    
    if (priorityScore >= 80) return <Badge variant="critical">{priorityLabel}</Badge>;
    if (priorityScore >= 60) return <Badge variant="warning">{priorityLabel}</Badge>;
    return <Badge variant="neutral">{priorityLabel}</Badge>;
  };

  const getRiskBadge = (riskStatus: string | null) => {
    if (!riskStatus) return <Badge variant="neutral">Safe</Badge>;
    
    switch (riskStatus) {
      case 'Blocked':
        return <Badge variant="critical">Blocked</Badge>;
      case 'At Risk':
        return <Badge variant="warning">At Risk</Badge>;
      case 'Safe':
        return <Badge variant="success">Safe</Badge>;
      default:
        return <Badge variant="neutral">{riskStatus}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={loadOrders}
            className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-zinc-500">No orders found. The database may be empty.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Orders</h1>
        <p className="text-sm text-zinc-600 mt-1">Order management and allocation</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="text-left p-3 text-xs font-medium text-zinc-600 uppercase tracking-wider">
                    Order Code
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-zinc-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-zinc-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-zinc-600 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-zinc-600 uppercase tracking-wider">
                    Risk
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-zinc-600 uppercase tracking-wider">
                    Due Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors"
                  >
                    <td className="p-3">
                      <span className="font-mono text-sm font-medium text-zinc-900">
                        {order.order_code}
                      </span>
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="text-sm text-zinc-900">{order.customer_name}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="active">{order.status}</Badge>
                    </td>
                    <td className="p-3">
                      {getPriorityBadge(order.priority_label, order.priority_score)}
                    </td>
                    <td className="p-3">
                      {getRiskBadge(order.risk_status)}
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-xs text-zinc-600">
                        {order.due_at ? formatDate(order.due_at) : 'Not set'}
                      </span>
                    </td>
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
