import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { ordersApi } from '../api/orders';
import type { Order, StatusAction } from '../types';
import { STATUS_ACTIONS } from '../types';
import { Badge } from './Badge';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { ArrowRight, Clock } from 'lucide-react';
import { useToast } from './Toast';

interface OrderCardProps {
  order: Order;
  onTransitionSuccess?: () => void;
}

export function OrderCard({ order, onTransitionSuccess }: OrderCardProps) {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const getPriorityBadge = (priorityLabel: string | null, priorityScore: number | null) => {
    if (!priorityLabel || priorityScore === null) {
      return <Badge variant="neutral">Priority: None</Badge>;
    }
    
    if (priorityScore >= 80) return <Badge variant="critical">Priority: {priorityLabel}</Badge>;
    if (priorityScore >= 60) return <Badge variant="warning">Priority: {priorityLabel}</Badge>;
    return <Badge variant="neutral">Priority: {priorityLabel}</Badge>;
  };

  const getRiskBadge = (riskStatus: string | null) => {
    if (!riskStatus) return <Badge variant="success">Risk: Safe</Badge>;
    
    switch (riskStatus) {
      case 'Blocked':
        return <Badge variant="critical">Risk: Blocked</Badge>;
      case 'At Risk':
        return <Badge variant="warning">Risk: At Risk</Badge>;
      case 'Safe':
        return <Badge variant="success">Risk: Safe</Badge>;
      default:
        return <Badge variant="neutral">Risk: {riskStatus}</Badge>;
    }
  };

  const handleAction = async (action: StatusAction) => {
    try {
      setIsLoading(action.action);
      
      switch (action.action) {
        case 'start_picking':
          await ordersApi.startPicking(order.id);
          break;
        case 'confirm_picked':
          await ordersApi.confirmPicked(order.id);
          break;
        case 'confirm_packed':
          await ordersApi.confirmPacked(order.id);
          break;
        case 'send_to_qc':
          await ordersApi.sendToQC(order.id);
          break;
        case 'qc_pass':
          await ordersApi.qcPass(order.id);
          break;
        case 'qc_fail':
          await ordersApi.qcFail(order.id);
          break;
        case 'dispatch':
          await ordersApi.dispatchOrder(order.id);
          break;
        default:
          throw new Error(`Unknown action: ${action.action}`);
      }
      
      showToast(`${action.label} for order ${order.order_code} successful`, 'success');
      onTransitionSuccess?.();
    } catch (err) {
      console.error('Transition error:', err);
      if (isAxiosError(err) && err.response?.status === 409) {
        const message = err.response.data?.detail || 'Action not allowed';
        showToast(`Action not allowed: ${message}`, 'error');
      } else {
        showToast('Failed to perform action. Please try again.', 'error');
      }
    } finally {
      setIsLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const availableActions = STATUS_ACTIONS[order.status] || [];

  return (
    <Card className="glass-card group hover:border-[#f9b17a]/50">
      <CardContent className="p-5 space-y-3">
        {/* Header Link */}
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/orders/${order.id}`}
            aria-label={`View order ${order.order_code} details for customer ${order.customer_name}`}
            className="flex-1 min-w-0 rounded-lg p-1 -m-1 focus-visible:ring-2 focus-visible:ring-[#f9b17a] block"
          >
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold text-white tracking-wide group-hover:text-[#f9b17a] transition-colors">
                {order.order_code}
              </h3>
              <ArrowRight className="w-3.5 h-3.5 text-[#9ba3c9] group-hover:text-[#f9b17a] group-hover:translate-x-1 transition-all" aria-hidden="true" />
            </div>
            <p className="text-xs text-[#d1d5db] mt-0.5 truncate font-medium">{order.customer_name}</p>
          </Link>
          <Badge variant="active" className="shrink-0 font-mono text-[11px] capitalize">Status: {order.status}</Badge>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {getPriorityBadge(order.priority_label, order.priority_score)}
          {getRiskBadge(order.risk_status)}
        </div>

        {/* Due Date */}
        {order.due_at && (
          <div className="text-xs text-[#d1d5db] flex items-center gap-1.5 font-mono bg-[#16192b] p-2.5 rounded-xl border border-[#424769]/50">
            <Clock className="w-3.5 h-3.5 text-[#f9b17a]" aria-hidden="true" />
            <span>Target: <strong className="text-white">{formatDate(order.due_at)}</strong></span>
          </div>
        )}

        {/* Actions */}
        {availableActions.length > 0 && (
          <div className="flex items-center gap-2 pt-3 border-t border-[#424769]/50">
            {availableActions.map((action) => (
              <Button
                key={action.action}
                variant={action.variant}
                loading={isLoading === action.action}
                disabled={Boolean(isLoading)}
                aria-label={`${action.label} order ${order.order_code}`}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleAction(action);
                }}
                className="text-xs px-3 py-1.5 font-bold shadow-sm"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}