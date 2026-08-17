import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ExceptionReportModal } from '../components/ExceptionReportModal';
import { DecisionAlert } from '../components/DecisionAlert';
import { eventsApi } from '../api/events';
import type { EventPayload, DecisionResponse } from '../types';
import { AlertTriangle } from 'lucide-react';

export function Fulfillment() {
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [decisionResult, setDecisionResult] = useState<DecisionResponse | null>(null);

  const handleExceptionSubmit = async (payload: EventPayload) => {
    try {
      const result = await eventsApi.submitEvent(payload);
      setDecisionResult(result);
    } catch (err) {
      console.error('Error submitting exception:', err);
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Fulfillment</h1>
          <p className="text-sm text-zinc-600 mt-1">Picking, packing, and dispatch operations</p>
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
      
      <Card>
        <CardHeader>
          <CardTitle>Fulfillment Board</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 italic">
            Kanban-style fulfillment board showing Ready to Pick → Picking → Packed → Quality Check → Ready to Dispatch → Dispatched stages.
          </p>
        </CardContent>
      </Card>

      {/* Exception Report Modal */}
      <ExceptionReportModal
        isOpen={isExceptionModalOpen}
        onClose={() => setIsExceptionModalOpen(false)}
        onSubmit={handleExceptionSubmit}
      />
    </div>
  );
}
