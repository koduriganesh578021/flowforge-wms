import type { DecisionMode } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { CheckCircle, AlertTriangle, AlertOctagon, Clock } from 'lucide-react';

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
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    label: 'Auto-Executed'
  },
  APPROVAL_REQUIRED: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    label: 'Approval Required'
  },
  ESCALATE: {
    icon: AlertOctagon,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
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
    <Card className={`${config.bgColor} ${config.borderColor} border`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${config.color}`} />
            <CardTitle className="text-base">Decision: {config.label}</CardTitle>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-zinc-700">{explanation}</p>
        
        {alternateBinSuggestion && (
          <div className="mt-3 p-3 bg-white rounded-md border border-zinc-200">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 mb-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              Alternate Bin Suggestion
            </div>
            <div className="text-sm text-zinc-600 space-y-1">
              <p><span className="font-medium">Location:</span> {alternateBinSuggestion.location_code}</p>
              <p><span className="font-medium">Available:</span> {alternateBinSuggestion.quantity_available} units</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
