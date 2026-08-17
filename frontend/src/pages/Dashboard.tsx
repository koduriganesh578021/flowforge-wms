import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/Badge';
import { ordersApi } from '../api/orders';
import { eventsApi } from '../api/events';
import type { Order } from '../types';

export function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [exceptions, setExceptions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [ordersData, exceptionsData] = await Promise.all([
        ordersApi.getOrders(),
        eventsApi.getExceptions().catch(() => [])
      ]);
      
      setOrders(ordersData);
      setExceptions(exceptionsData.length);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'Created' || o.status === 'Allocated').length;
  const criticalOrders = orders.filter(o => o.priority_score !== null && o.priority_score >= 80).length;
  const lowStockCount = 0; // TODO: Add inventory API call

  const getRecommendedActions = () => {
    const actions = [];
    
    if (criticalOrders > 0) {
      actions.push({
        priority: 'critical',
        title: `${criticalOrders} Critical orders require immediate attention`,
        action: 'Review Orders',
        link: '/orders'
      });
    }
    
    if (pendingOrders > 5) {
      actions.push({
        priority: 'warning',
        title: `${pendingOrders} orders pending allocation`,
        action: 'Run Allocation',
        link: '/orders'
      });
    }
    
    if (exceptions > 0) {
      actions.push({
        priority: 'critical',
        title: `${exceptions} exceptions require review`,
        action: 'Review Exceptions',
        link: '/exceptions'
      });
    }
    
    if (actions.length === 0) {
      actions.push({
        priority: 'neutral',
        title: 'All systems operational',
        action: 'Monitor Operations',
        link: '/orders'
      });
    }
    
    return actions;
  };

  const actions = getRecommendedActions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Command Center</h1>
        <p className="text-sm text-zinc-600 mt-1">Operations overview and action queue</p>
      </div>
      
      {/* Dense KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-zinc-900">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-600 font-medium">Pending Orders</p>
                <p className="text-xl font-bold font-mono text-zinc-900">{loading ? '—' : pendingOrders}</p>
              </div>
              <Badge variant="active">Active</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-red-600">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-600 font-medium">Critical Orders</p>
                <p className="text-xl font-bold font-mono text-red-600">{loading ? '—' : criticalOrders}</p>
              </div>
              <Badge variant="critical">Urgent</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-amber-600">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-600 font-medium">Low Stock SKUs</p>
                <p className="text-xl font-bold font-mono text-amber-600">{loading ? '—' : lowStockCount}</p>
              </div>
              <Badge variant="warning">Alert</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-zinc-600">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-600 font-medium">Exceptions</p>
                <p className="text-xl font-bold font-mono text-zinc-900">{loading ? '—' : exceptions}</p>
              </div>
              <Badge variant={exceptions > 0 ? 'critical' : 'success'}>
                {exceptions > 0 ? 'Review' : 'Clear'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Required Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {actions.map((action, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={
                      action.priority === 'critical' ? 'critical' : 
                      action.priority === 'warning' ? 'warning' : 'neutral'
                    }
                  >
                    {action.priority === 'critical' ? 'Urgent' : 
                     action.priority === 'warning' ? 'Review' : 'Info'}
                  </Badge>
                  <p className="text-sm text-zinc-900">{action.title}</p>
                </div>
                <a
                  href={action.link}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {action.action} →
                </a>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
