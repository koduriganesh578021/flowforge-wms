/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { eventsApi } from '../api/events';
import { SIMULATION_DATA_CHANGED_EVENT } from '../api/simulation';
import type { ExceptionEvent, DecisionMode } from '../types';
import { AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useToast, Toast } from '../components/Toast';

export function Exceptions() {
  const [exceptions, setExceptions] = useState<ExceptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DecisionMode | 'ALL'>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [selectedException, setSelectedException] = useState<ExceptionEvent | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const { toasts, showToast, removeToast } = useToast();

  const loadExceptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await eventsApi.getExceptions();
      setExceptions(data);
      setLiveAnnouncement(`Exceptions loaded. ${data.length} total records.`);
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
    return new Date(dateString).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
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

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedException) return;

    try {
      setIsResolving(true);
      const resolved = await eventsApi.resolveException(selectedException.id, {
        actor: 'operator',
        note: resolutionNote.trim() || undefined,
      });
      setExceptions(current => current.map(item => item.id === resolved.id ? resolved : item));
      setSelectedException(null);
      setResolutionNote('');
      showToast(`Exception #${resolved.id} successfully resolved.`, 'success');
    } catch (err) {
      console.error('Error resolving exception:', err);
      showToast('Unable to resolve this exception. Please try again.', 'error');
    } finally {
      setIsResolving(false);
    }
  };

  const closeResolutionModal = () => {
    if (!isResolving) {
      setSelectedException(null);
      setResolutionNote('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Polite Live Announcement */}
      <div className="sr-only" aria-live="polite" role="status">
        {liveAnnouncement}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 font-heading">
            Exceptions & Decision Engine Feed
            <AlertTriangle className="w-6 h-6 text-[#f9b17a]" aria-hidden="true" />
          </h1>
          <p className="text-xs text-[#9ba3c9] mt-1 font-medium">
            Real-time warehouse disruption logs and automated decision recommendations
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={loadExceptions}
          disabled={loading}
          aria-label="Refresh exceptions feed"
          className="gap-2 shrink-0 shadow-md"
        >
          <RefreshCw className={`w-4 h-4 text-[#f9b17a] ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh Feed
        </Button>
      </div>

      {/* Filter Options */}
      <Card className="glass-card">
        <CardHeader className="pb-3 border-b border-[#424769]/50">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-white font-heading">
            Filter by Decision Policy Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex gap-2.5 flex-wrap" role="toolbar" aria-label="Decision Mode Filter">
            <button
              type="button"
              aria-pressed={filter === 'ALL'}
              onClick={() => setFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#f9b17a] ${
                filter === 'ALL'
                  ? 'bg-[#f9b17a] text-[#16192b] font-bold shadow-md'
                  : 'bg-[#2d3250] text-[#d1d5db] hover:bg-[#424769]'
              }`}
            >
              All ({exceptions.length})
            </button>
            <button
              type="button"
              aria-pressed={filter === 'AUTO_EXECUTED'}
              onClick={() => setFilter('AUTO_EXECUTED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#f9b17a] ${
                filter === 'AUTO_EXECUTED'
                  ? 'bg-emerald-500 text-[#16192b] font-bold shadow-md'
                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              Auto-Executed ({exceptions.filter(e => e.decision_mode === 'AUTO_EXECUTED').length})
            </button>
            <button
              type="button"
              aria-pressed={filter === 'APPROVAL_REQUIRED'}
              onClick={() => setFilter('APPROVAL_REQUIRED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#f9b17a] ${
                filter === 'APPROVAL_REQUIRED'
                  ? 'bg-amber-500 text-[#16192b] font-bold shadow-md'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              Approval Required ({exceptions.filter(e => e.decision_mode === 'APPROVAL_REQUIRED').length})
            </button>
            <button
              type="button"
              aria-pressed={filter === 'ESCALATE'}
              onClick={() => setFilter('ESCALATE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#f9b17a] ${
                filter === 'ESCALATE'
                  ? 'bg-rose-500 text-white font-bold shadow-md'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20'
              }`}
            >
              Manual Review ({exceptions.filter(e => e.decision_mode === 'ESCALATE').length})
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Exception List Feed */}
      {loading ? (
        <div className="flex items-center justify-center h-64 glass-card rounded-2xl" aria-busy="true">
          <div className="text-[#9ba3c9] font-mono flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#f9b17a]" aria-hidden="true" />
            Loading exception feed...
          </div>
        </div>
      ) : error ? (
        <div role="alert" aria-live="assertive">
          <Card className="border-rose-500/40 bg-rose-950/40 text-rose-200">
            <CardContent className="p-6">
              <div className="text-rose-300 font-semibold">{error}</div>
            </CardContent>
          </Card>
        </div>
      ) : filteredExceptions.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center text-[#9ba3c9] italic font-medium">
            {filter === 'ALL' 
              ? '✓ No exceptions recorded. Warehouse operating at 100% policy compliance.' 
              : `No exceptions with decision mode: ${filter}`}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4" role="feed" aria-label="Warehouse Exceptions Feed">
          {filteredExceptions.map((exception) => (
            <Card key={exception.id} className="glass-card">
              <CardHeader className="pb-3 border-b border-[#424769]/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
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
                    <CardTitle className="text-base font-bold text-white font-mono">
                      Exception #{exception.id} · SKU: {exception.sku_id}
                    </CardTitle>
                  </div>
                  <div className="text-xs font-mono text-[#9ba3c9]">
                    {formatDate(exception.timestamp)}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                <div className="p-4 bg-[#16192b] rounded-xl border border-[#424769]/60">
                  <p className="text-xs text-white leading-relaxed font-medium">{exception.explanation}</p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[#16192b]/60 rounded-xl border border-[#424769]/40 text-xs font-mono">
                  <div>
                    <p className="text-[10px] text-[#9ba3c9] uppercase font-bold">Quantity</p>
                    <p className="font-bold text-white mt-0.5">{exception.quantity}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9ba3c9] uppercase font-bold">Order ID</p>
                    <p className="font-bold text-[#f9b17a] mt-0.5">{exception.order_id ? `#${exception.order_id}` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9ba3c9] uppercase font-bold">Location</p>
                    <p className="font-bold text-[#d1d5db] mt-0.5">{exception.location_id ? `Bin #${exception.location_id}` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9ba3c9] uppercase font-bold">Status</p>
                    <Badge variant={exception.status.toLowerCase() === 'resolved' ? 'success' : 'warning'} className="mt-0.5">
                      Status: {exception.status}
                    </Badge>
                  </div>
                </div>
                
                {exception.notes && (
                  <div className="pt-2 text-xs">
                    <p className="text-[#9ba3c9] font-bold uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-[#d1d5db] bg-[#16192b] p-3 rounded-xl border border-[#424769]/50">{exception.notes}</p>
                  </div>
                )}

                {exception.resolution_note && (
                  <div className="pt-2 text-xs">
                    <p className="text-emerald-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Resolution Note
                    </p>
                    <p className="text-white bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">{exception.resolution_note}</p>
                  </div>
                )}

                {exception.status.toLowerCase() !== 'resolved' && (
                  <div className="flex justify-end pt-3 border-t border-[#424769]/50">
                    <Button
                      variant="primary"
                      aria-label={`Resolve exception #${exception.id}`}
                      onClick={() => setSelectedException(exception)}
                    >
                      Resolve Exception
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      <Modal
        isOpen={selectedException !== null}
        onClose={closeResolutionModal}
        title={selectedException ? `Resolve Exception #${selectedException.id}` : 'Resolve Exception'}
      >
        {selectedException && (
          <form onSubmit={handleResolve} className="space-y-4 text-white">
            <p className="text-xs text-[#d1d5db] leading-relaxed">
              This marks the exception as resolved. Cycle-count discrepancies will be verified, and blocked order workflow resumes when no other exception remains open.
            </p>
            <div>
              <label htmlFor="resolution-note" className="block text-xs font-bold text-white mb-1.5 uppercase font-heading">
                Corrective Action Note (optional)
              </label>
              <textarea
                id="resolution-note"
                value={resolutionNote}
                onChange={(event) => setResolutionNote(event.target.value)}
                maxLength={500}
                rows={3}
                className="w-full rounded-xl bg-[#16192b] border border-[#424769] px-3.5 py-2.5 text-xs text-white placeholder-[#9ba3c9] focus:border-[#f9b17a] focus:outline-none font-sans"
                placeholder="Describe the corrective action taken"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#424769]/50">
              <Button type="button" variant="secondary" onClick={closeResolutionModal} disabled={isResolving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={isResolving} disabled={isResolving}>
                Confirm Resolution
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Toast notifications */}
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

