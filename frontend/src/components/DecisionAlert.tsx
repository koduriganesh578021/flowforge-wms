import type { DecisionMode } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { CheckCircle, AlertTriangle, AlertOctagon, Clock, X } from 'lucide-react';

interface DecisionAlertProps {
  decisionMode: DecisionMode;
  explanation: string;
  alternateBinSuggestion?: {
    location_id: number;
    location_code: string;
    quantity_available: number;
  };
  onClose?: () => void;
}

const decisionConfig = {
  AUTO_EXECUTED: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-950/30',
    borderColor: 'border-emerald-500/40',
    label: 'Auto-Executed'
  },
  APPROVAL_REQUIRED: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-950/30',
    borderColor: 'border-amber-500/40',
    label: 'Approval Required'
  },
  ESCALATE: {
    icon: AlertOctagon,
    color: 'text-rose-400',
    bgColor: 'bg-rose-950/30',
    borderColor: 'border-rose-500/40',
    label: 'Escalated'
  }
};

export function DecisionAlert({ 
  decisionMode, 
  explanation, 
  alternateBinSuggestion,
  onClose 
}: DecisionAlertProps) {
  const config = decisionConfig[decisionMode];
  const Icon = config.icon;

  return (
    <div role="status" aria-live="polite">
      <Card className={`${config.bgColor} ${config.borderColor} border glass-card text-white`}>
        <CardHeader className="pb-3 border-b border-[#424769]/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`w-5 h-5 ${config.color}`} aria-hidden="true" />
              <CardTitle className="text-base font-bold font-heading">
                Decision: {config.label}
              </CardTitle>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Dismiss decision alert"
                className="text-[#9ba3c9] hover:text-white p-1 rounded-lg hover:bg-[#2d3250] focus:outline-none focus:ring-2 focus:ring-[#f9b17a] transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <p className="text-xs text-white leading-relaxed font-medium">{explanation}</p>
          
          {alternateBinSuggestion && (
            <div className="mt-3 p-3.5 bg-[#16192b] rounded-xl border border-[#424769]/60">
              <div className="flex items-center gap-2 text-xs font-bold text-[#f9b17a] font-mono mb-2">
                <Clock className="w-4 h-4 text-[#f9b17a]" aria-hidden="true" />
                Alternate Bin Suggestion
              </div>
              <div className="text-xs text-[#d1d5db] font-mono space-y-1">
                <p><span className="font-semibold text-[#9ba3c9]">Location:</span> <strong className="text-white">{alternateBinSuggestion.location_code}</strong></p>
                <p><span className="font-semibold text-[#9ba3c9]">Available:</span> <strong className="text-emerald-400">{alternateBinSuggestion.quantity_available} units</strong></p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

