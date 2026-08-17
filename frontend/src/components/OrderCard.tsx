import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { ordersApi } from '../api/orders';
import type { Order, StatusAction } from '../types';
import { STATUS_ACTIONS } from '../types';
import { Badge } from './Badge';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Loader2 } from 'lucide-react';
import { useToast } from './Toast';

interface OrderCardProps {
  order: Order;
  onTransitionSuccess?: () => void;
}

export function OrderCard({ order, onTransitionSuccess }: OrderCardProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const getPriorityBadge = (priorityLabel: string | null, priorityScore: number | null) => {
    if (!priorityLabel || priorityScore === null) {
      return <Badge variant="neutral">Not Prioritized</Badge>;
    }
    
    if (priorityScore >= 80) return <Badge variant="critical">{priorityLabel}</Badge>;
    if (priorityScore >= 60) return <Badge variant="warning">{priorityLabel}</Badge>;
    return <Badge variant="neutral">{priorityLabel}</Badge>;
  };

  const getRiskBadge = (riskStatus: string | null) => {
    if (!riskStatus) return <Badge variant="neutral">Safe</Badge>;
    
    switch (riskStatus) {
      case 'Blocked':
        return <Badge variant="critical">Blocked</Badge>;
      case 'At Risk':
        return <Badge variant="warning">At Risk</Badge>;
      case 'Safe':
        return <Badge variant="success">Safe</Badge>;
      default:
        return <Badge variant="neutral">{riskStatus}</Badge>;
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
      
      showToast(`${action.label} successful`, 'success');
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
    return new Date(dateString).toLocaleString();
  };

  const availableActions = STATUS_ACTIONS[order.status] || [];

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div 
            className="flex items-start justify-between"
            onClick={() => navigate(`/orders/${order.id}`)}
          >
            <div className="flex-1">
              <h3 className="font-mono text-sm font-medium text-zinc-900">
                {order.order_code}
              </h3>
              <p className="text-xs text-zinc-600 mt-0.5">{order.customer_name}</p>
            </div>
            <Badge variant="active">{order.status}</Badge>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {getPriorityBadge(order.priority_label, order.priority_score)}
            {getRiskBadge(order.risk_status)}
          </div>

          {/* Due Date */}
          {order.due_at && (
            <div className="text-xs text-zinc-500">
              Due: <span className="font-mono">{formatDate(order.due_at)}</span>
            </div>
          )}

          {/* Actions */}
          {availableActions.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
              {availableActions.map((action) => (
                <Button
                  key={action.action}
                  variant={action.variant}
                  disabled={isLoading === action.action}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(action);
                  }}
                  className="text-xs px-3 py-1.5"
                >
                  {isLoading === action.action ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    action.label
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}