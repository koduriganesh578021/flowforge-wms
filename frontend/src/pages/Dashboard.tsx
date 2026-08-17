/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/Badge';
import { BottleneckCard } from '../components/BottleneckCard';
import { analyticsApi } from '../api/analytics';
import type { DashboardSummary } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bottlenecksError, setBottlenecksError] = useState<boolean>(false);

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);
      setBottlenecksError(false);
      
      const data = await analyticsApi.getDashboardSummary();
      setDashboardData(data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Unable to load dashboard data.');
      
      // Try to load just bottlenecks if dashboard fails
      try {
        const bottlenecks = await analyticsApi.getBottlenecks();
        setDashboardData({
          pending_orders: 0,
          critical_orders: 0,
          low_stock_skus: 0,
          open_exceptions: 0,
          top_bottlenecks: bottlenecks
        });
        setBottlenecksError(false);
      } catch (bottleneckErr) {
        console.error('Error loading bottlenecks:', bottleneckErr);
        setBottlenecksError(true);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const getChartData = () => {
    if (!dashboardData || !dashboardData.top_bottlenecks) return [];
    
    return dashboardData.top_bottlenecks.map(bottleneck => ({
      stage: bottleneck.stage,
      queueSize: bottleneck.queue_size,
      waitTime: bottleneck.average_wait_minutes
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="space-y-4">
        <div className="text-red-600">{error}</div>
        <button
          onClick={() => loadDashboardData()}
          disabled={loading}
          className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Retry'}
        </button>
      </div>
    );
  }

  const chartData = getChartData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Command Center</h1>
          <p className="text-sm text-zinc-600 mt-1">Operations overview and action queue</p>
        </div>
        <button
          onClick={() => loadDashboardData(true)}
          disabled={loading || isRefreshing}
          className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {/* Error Banner */}
      {error && dashboardData && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Dense KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-zinc-900">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-600 font-medium">Pending Orders</p>
                <p className="text-xl font-bold font-mono text-zinc-900">
                  {dashboardData?.pending_orders ?? '—'}
                </p>
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
                <p className="text-xl font-bold font-mono text-red-600">
                  {dashboardData?.critical_orders ?? '—'}
                </p>
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
                <p className="text-xl font-bold font-mono text-amber-600">
                  {dashboardData?.low_stock_skus ?? '—'}
                </p>
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
                <p className="text-xl font-bold font-mono text-zinc-900">
                  {dashboardData?.open_exceptions ?? '—'}
                </p>
              </div>
              <Badge variant={(dashboardData?.open_exceptions ?? 0) > 0 ? 'critical' : 'success'}>
                {(dashboardData?.open_exceptions ?? 0) > 0 ? 'Review' : 'Clear'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottleneck Analysis */}
      {dashboardData?.top_bottlenecks && dashboardData.top_bottlenecks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Bottleneck Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardData.top_bottlenecks.slice(0, 3).map((bottleneck, index) => (
                <BottleneckCard key={index} bottleneck={bottleneck} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : bottlenecksError ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">Bottleneck analytics unavailable.</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Queue Size Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Queue Size by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="stage" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px'
                    }}
                  />
                  <Bar dataKey="queueSize" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Average Fulfillment Time */}
      {dashboardData?.average_fulfillment_time && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-600 font-medium">Average Fulfillment Time</p>
                <p className="text-xl font-bold font-mono text-zinc-900">
                  {dashboardData.average_fulfillment_time.toFixed(1)} minutes
                </p>
              </div>
              <Badge variant="success">On Track</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
