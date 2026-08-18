import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ExceptionReportModal } from '../components/ExceptionReportModal';
import { DecisionAlert } from '../components/DecisionAlert';
import { eventsApi } from '../api/events';
import type { EventPayload, DecisionResponse } from '../types';
import { AlertTriangle, Kanban } from 'lucide-react';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 font-heading">
            Fulfillment Stage Pipeline
            <Kanban className="w-6 h-6 text-[#f9b17a]" aria-hidden="true" />
          </h1>
          <p className="text-xs text-[#9ba3c9] mt-1 font-medium">Picking, packing, and dispatch operations</p>
        </div>
        <Button
          variant="danger"
          onClick={() => setIsExceptionModalOpen(true)}
          aria-label="Report fulfillment disruption or exception"
          prefix={<AlertTriangle className="w-4 h-4" aria-hidden="true" />}
        >
          Report Issue
        </Button>
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
      
      <Card className="glass-card">
        <CardHeader className="border-b border-[#424769]/50 pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-white font-heading">
            Fulfillment Board
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-xs text-[#d1d5db] font-mono leading-relaxed">
            Multi-stage fulfillment pipeline tracking Ready to Pick → Picking → Picked → Packing → Quality Check → Ready to Dispatch → Dispatched stages.
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

