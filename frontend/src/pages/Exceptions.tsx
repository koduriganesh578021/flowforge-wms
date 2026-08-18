/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { eventsApi } from '../api/events';
import { SIMULATION_DATA_CHANGED_EVENT } from '../api/simulation';
import type { ExceptionEvent, DecisionMode } from '../types';

export function Exceptions() {
  const [exceptions, setExceptions] = useState<ExceptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DecisionMode | 'ALL'>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [selectedException, setSelectedException] = useState<ExceptionEvent | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  useEffect(() => {
    const refresh = () => { void loadExceptions(); };
    window.addEventListener(SIMULATION_DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SIMULATION_DATA_CHANGED_EVENT, refresh);
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
      case 'INVENTORY_DISCREPANCY': return 'Inventory Discrepancy';
      default: return eventType;
    }
  };

  const closeResolutionModal = () => {
    if (!isResolving) {
      setSelectedException(null);
      setResolutionNote('');
    }
  };

  const handleResolve = async () => {
    if (!selectedException) return;

    try {
      setIsResolving(true);
      setActionError(null);
      const resolved = await eventsApi.resolveException(selectedException.id, {
        actor: 'operator',
        note: resolutionNote.trim() || undefined,
      });
      setExceptions(current => current.map(item => item.id === resolved.id ? resolved : item));
      setSelectedException(null);
      setResolutionNote('');
    } catch (err) {
      console.error('Error resolving exception:', err);
      setActionError('Unable to resolve this exception. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Exceptions</h1>
        <p className="text-sm text-zinc-600 mt-1">Decision center and exception management</p>
      </div>

      {actionError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {actionError}
        </div>
      )}

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

                {exception.resolution_note && (
                  <div className="pt-2">
                    <p className="text-zinc-600 mb-1 text-sm">Resolution Note</p>
                    <p className="text-sm text-zinc-700">{exception.resolution_note}</p>
                  </div>
                )}

                {exception.status.toLowerCase() !== 'resolved' && (
                  <div className="flex justify-end pt-3 border-t">
                    <Button variant="primary" onClick={() => setSelectedException(exception)}>
                      Resolve Exception
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={selectedException !== null}
        onClose={closeResolutionModal}
        title={selectedException ? `Resolve Exception #${selectedException.id}` : 'Resolve Exception'}
      >
        {selectedException && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-700">
              This marks the exception as resolved. Cycle-count discrepancies will be verified, and blocked order workflow resumes when no other exception remains open.
            </p>
            <div>
              <label htmlFor="resolution-note" className="block text-sm font-medium text-zinc-700 mb-1">
                Resolution note (optional)
              </label>
              <textarea
                id="resolution-note"
                value={resolutionNote}
                onChange={(event) => setResolutionNote(event.target.value)}
                maxLength={500}
                rows={3}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the corrective action taken"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeResolutionModal} disabled={isResolving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleResolve} disabled={isResolving}>
                {isResolving ? 'Resolving...' : 'Resolve Exception'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
