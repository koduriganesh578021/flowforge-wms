/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/Badge';
import { eventsApi } from '../api/events';
import type { ExceptionEvent, DecisionMode } from '../types';

export function Exceptions() {
  const [exceptions, setExceptions] = useState<ExceptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DecisionMode | 'ALL'>('ALL');
  const [error, setError] = useState<string | null>(null);

  const loadExceptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await eventsApi.getExceptions();
      setExceptions(data);
    } catch (err) {
      setError('Failed to load exceptions. Please check if the backend is running.');
      console.error('Error loading exceptions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExceptions();
  }, [loadExceptions]);

  const filteredExceptions = exceptions.filter(exc => {
    if (filter === 'ALL') return true;
    return exc.decision_mode === filter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case 'ITEM_DAMAGED': return 'Item Damaged';
      case 'ITEM_MISSING': return 'Item Missing';
      case 'QC_FAILED': return 'QC Failed';
      default: return eventType;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Exceptions</h1>
        <p className="text-sm text-zinc-600 mt-1">Decision center and exception management</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Filter by Decision Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === 'ALL'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              All ({exceptions.length})
            </button>
            <button
              onClick={() => setFilter('AUTO_EXECUTED')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === 'AUTO_EXECUTED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
            >
              Auto-Executed ({exceptions.filter(e => e.decision_mode === 'AUTO_EXECUTED').length})
            </button>
            <button
              onClick={() => setFilter('APPROVAL_REQUIRED')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === 'APPROVAL_REQUIRED'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
            >
              Approval Required ({exceptions.filter(e => e.decision_mode === 'APPROVAL_REQUIRED').length})
            </button>
            <button
              onClick={() => setFilter('ESCALATE')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === 'ESCALATE'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              Manual Review Required ({exceptions.filter(e => e.decision_mode === 'ESCALATE').length})
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Exception List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-500">Loading exceptions...</div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600">{error}</div>
          </CardContent>
        </Card>
      ) : filteredExceptions.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-zinc-500 italic">
              {filter === 'ALL' 
                ? 'No exceptions reported yet.' 
                : `No exceptions with decision mode: ${filter}`}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredExceptions.map((exception) => (
            <Card key={exception.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        exception.decision_mode === 'AUTO_EXECUTED' ? 'success' :
                        exception.decision_mode === 'APPROVAL_REQUIRED' ? 'warning' : 'critical'
                      }>
                        {exception.decision_mode === 'AUTO_EXECUTED' ? 'Auto-Executed' :
                         exception.decision_mode === 'APPROVAL_REQUIRED' ? 'Approval Required' : 'Escalated'}
                      </Badge>
                      <Badge variant="neutral">{getEventLabel(exception.event_type)}</Badge>
                    </div>
                    <CardTitle className="text-base">
                      Exception #{exception.id} · SKU: {exception.sku_id}
                    </CardTitle>
                  </div>
                  <div className="text-sm text-zinc-500">
                    {formatDate(exception.timestamp)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-zinc-50 rounded-md border border-zinc-200">
                  <p className="text-sm text-zinc-700">{exception.explanation}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm pt-3 border-t">
                  <div>
                    <p className="text-zinc-600 mb-1">Quantity</p>
                    <p className="font-medium">{exception.quantity}</p>
                  </div>
                  <div>
                    <p className="text-zinc-600 mb-1">Order ID</p>
                    <p className="font-medium">{exception.order_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-600 mb-1">Location ID</p>
                    <p className="font-medium">{exception.location_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-600 mb-1">Status</p>
                    <Badge variant="active">{exception.status}</Badge>
                  </div>
                </div>
                
                {exception.notes && (
                  <div className="pt-2">
                    <p className="text-zinc-600 mb-1 text-sm">Notes</p>
                    <p className="text-sm text-zinc-700">{exception.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
