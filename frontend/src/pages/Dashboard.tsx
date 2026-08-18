import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/ui/Button';
import { BottleneckCard } from '../components/BottleneckCard';
import { useCommandCenter } from '../api/analytics';
import { SIMULATION_DATA_CHANGED_EVENT } from '../api/simulation';
import type {
  BottleneckSummary,
  ExceptionAlert,
  TopAction,
  DashboardKPIs,
} from '../types';
import {
  AlertTriangle,
  ArrowRight,
  Gauge,
  Package,
  RefreshCw,
  ShoppingCart,
  Warehouse,
  XCircle,
} from 'lucide-react';

/* ===== Severity helpers ===== */

const SEVERITY_BADGE_VAR: Record<string, 'critical' | 'warning' | 'success' | 'neutral'> = {
  HIGH: 'critical',
  MEDIUM: 'warning',
  LOW: 'success',
};

const SEVERITY_BORDER: Record<string, string> = {
  HIGH: 'border-l-red-600',
  MEDIUM: 'border-l-amber-600',
  LOW: 'border-l-emerald-600',
};

const PRIORITY_BADGE_VAR: Record<string, 'critical' | 'warning' | 'success' | 'neutral'> = {
  HIGH: 'critical',
  MEDIUM: 'warning',
  LOW: 'success',
};

const ACTION_ICON_VAR: Record<string, string> = {
  REORDER: 'bg-amber-100 text-amber-700',
  EXCEPTION_REVIEW: 'bg-red-100 text-red-700',
  ALLOCATE_ORDER: 'bg-blue-100 text-blue-700',
};

/* ===== Skeleton components ===== */

function SkeletonKpiRow() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-l-4 border-l-zinc-300">
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-zinc-200 rounded animate-pulse" />
              <div className="h-6 w-12 bg-zinc-200 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SkeletonBottlenecks() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="border-l-4 border-l-zinc-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-40 bg-zinc-200 rounded animate-pulse" />
              <div className="h-5 w-14 bg-zinc-200 rounded animate-pulse" />
            </div>
            <div className="h-3 w-56 bg-zinc-200 rounded animate-pulse" />
            <div className="pt-2 border-t border-zinc-200">
              <div className="h-3 w-32 bg-zinc-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-full bg-zinc-100 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SkeletonList({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 border border-zinc-200 rounded-md space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-56 bg-zinc-200 rounded animate-pulse" />
            <div className="h-5 w-14 bg-zinc-200 rounded animate-pulse" />
          </div>
          <div className="h-3 w-48 bg-zinc-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/* ===== KPI Cards ===== */

interface KpiCardProps {
  label: string;
  value: number | string | null;
  unit?: string;
  border: string;
  valueColor?: string;
  badgeVariant?: 'critical' | 'warning' | 'success' | 'neutral' | 'active';
  badgeLabel?: string;
  icon: React.ReactNode;
}

function KpiCard({
  label,
  value,
  unit,
  border,
  valueColor = 'text-zinc-900',
  badgeVariant,
  badgeLabel,
  icon,
}: KpiCardProps) {
  const display = value === null || value === undefined ? '—' : value;
  return (
    <Card className={`border-l-4 ${border}`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-600 font-medium flex items-center gap-1.5">
              <span className="text-zinc-500">{icon}</span>
              {label}
            </p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-xl font-bold font-mono ${valueColor}`}>
                {display}
              </span>
              {unit ? (
                <span className="text-xs text-zinc-500 font-medium">{unit}</span>
              ) : null}
            </div>
          </div>
          {badgeVariant && badgeLabel ? (
            <Badge variant={badgeVariant}>{badgeLabel}</Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function KpiGrid({ kpis }: { kpis: DashboardKPIs }) {
  const cards: KpiCardProps[] = [
    {
      label: 'Pending Orders',
      value: kpis.pending_orders,
      border: 'border-l-blue-600',
      valueColor: 'text-zinc-900',
      badgeVariant: 'active',
      badgeLabel: 'Active',
      icon: <ShoppingCart className="w-3 h-3" />,
    },
    {
      label: 'Critical Orders',
      value: kpis.critical_orders,
      border: 'border-l-red-600',
      valueColor: 'text-red-600',
      badgeVariant: kpis.critical_orders > 0 ? 'critical' : 'neutral',
      badgeLabel: kpis.critical_orders > 0 ? 'Urgent' : 'Clear',
      icon: <XCircle className="w-3 h-3" />,
    },
    {
      label: 'Low-Stock SKUs',
      value: kpis.low_stock_skus,
      border: 'border-l-amber-600',
      valueColor: 'text-amber-600',
      badgeVariant: kpis.low_stock_skus > 0 ? 'warning' : 'success',
      badgeLabel: kpis.low_stock_skus > 0 ? 'Alert' : 'Clear',
      icon: <Warehouse className="w-3 h-3" />,
    },
    {
      label: 'Open Exceptions',
      value: kpis.open_exceptions,
      border: 'border-l-zinc-700',
      valueColor: 'text-zinc-900',
      badgeVariant: kpis.open_exceptions > 0 ? 'critical' : 'success',
      badgeLabel: kpis.open_exceptions > 0 ? 'Review' : 'Clear',
      icon: <AlertTriangle className="w-3 h-3" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <KpiCard key={i} {...c} />
      ))}
      {kpis.average_fulfillment_time_minutes !== null &&
      kpis.average_fulfillment_time_minutes !== undefined ? (
        <KpiCard
          label="Avg Fulfillment Time"
          value={kpis.average_fulfillment_time_minutes.toFixed(1)}
          unit="minutes"
          border="border-l-emerald-600"
          valueColor="text-emerald-700"
          badgeVariant="success"
          badgeLabel="On Track"
          icon={<Gauge className="w-3 h-3" />}
        />
      ) : null}
    </div>
  );
}

/* ===== Bottlenecks Panel ===== */

function BottlenecksPanel({ items }: { items: BottleneckSummary[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-zinc-500">
            No stage bottlenecks detected — all queues within thresholds.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {items.slice(0, 3).map((b, i) => (
        <BottleneckCard
          key={i}
          bottleneck={b as unknown as import('../types').Bottleneck}
        />
      ))}
    </div>
  );
}

/* ===== Exception navigation helpers ===== */

function exceptionNavigateTarget(e: ExceptionAlert): string {
  const orderId = e.context?.order_id;
  if (orderId !== null && orderId !== undefined) {
    return `/orders/${orderId}`;
  }
  return `/exceptions`;
}

function formatEventType(et: string): string {
  return et.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ExceptionsPanel({
  items,
  onNavigate,
}: {
  items: ExceptionAlert[];
  onNavigate: (path: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="p-4 border border-emerald-200 rounded-md bg-emerald-50">
        <p className="text-sm text-emerald-800 font-medium">
          No open exception alerts. Warehouse operating within policy.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.slice(0, 3).map((e) => {
        const target = exceptionNavigateTarget(e);
        return (
          <button
            key={e.id}
            onClick={() => onNavigate(target)}
            className={`w-full text-left p-3 rounded-md border-l-4 ${SEVERITY_BORDER[e.severity] ?? 'border-l-zinc-400'} border border-zinc-200 hover:bg-zinc-50 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[11px] text-zinc-500">
                    #{e.id}
                  </span>
                  <Badge variant={SEVERITY_BADGE_VAR[e.severity] ?? 'neutral'}>
                    {formatEventType(e.event_type)}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-zinc-900 leading-snug">
                  {e.summary}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 font-mono">
                  {e.context?.order_id ? (
                    <span>Order #{e.context.order_id}</span>
                  ) : null}
                  {e.context?.sku_id ? (
                    <span>SKU {e.context.sku_id}</span>
                  ) : null}
                  {e.context?.location_id ? (
                    <span>Bin {e.context.location_id}</span>
                  ) : null}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-1" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ===== Top Actions Panel ===== */

function actionNavigateTarget(a: TopAction): string {
  const ctx = a.context ?? {};
  switch (a.action_type) {
    case 'REORDER':
      return '/inventory';
    case 'ALLOCATE_ORDER':
      if (ctx.order_id) return `/orders/${ctx.order_id}`;
      return '/orders';
    case 'EXCEPTION_REVIEW':
      if (ctx.order_id) return `/orders/${ctx.order_id}`;
      return '/exceptions';
    default:
      if (ctx.order_id) return `/orders/${ctx.order_id}`;
      return '/';
  }
}

function actionLabel(at: string): string {
  switch (at) {
    case 'REORDER':
      return 'Reorder';
    case 'ALLOCATE_ORDER':
      return 'Allocate';
    case 'EXCEPTION_REVIEW':
      return 'Review';
    default:
      return 'Act';
  }
}

function TopActionsPanel({
  items,
  onNavigate,
}: {
  items: TopAction[];
  onNavigate: (path: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="p-4 border border-zinc-200 rounded-md bg-zinc-50 text-center">
        <p className="text-sm text-zinc-600">
          No actions required at this time.
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {items.slice(0, 5).map((a, i) => {
        const target = actionNavigateTarget(a);
        const iconColor = ACTION_ICON_VAR[a.action_type] ?? 'bg-zinc-100 text-zinc-700';
        return (
          <li
            key={i}
            className={`p-3 rounded-md border-l-4 ${SEVERITY_BORDER[a.priority] ?? 'border-l-zinc-400'} border border-zinc-200`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold ${iconColor}`}>
                    <Package className="w-3 h-3" />
                  </span>
                  <Badge variant={PRIORITY_BADGE_VAR[a.priority] ?? 'neutral'}>
                    {a.priority}
                  </Badge>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    {a.action_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm font-semibold text-zinc-900 font-mono leading-snug">
                  {a.title}
                </p>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  {a.description}
                </p>
              </div>
              <Button
                variant="secondary"
                className="flex-shrink-0 px-2.5 py-1.5 text-xs"
                onClick={() => onNavigate(target)}
              >
                {actionLabel(a.action_type)}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ===== Page ===== */

export function Dashboard() {
  const { data, isLoading, error, refetch } = useCommandCenter();
  const navigate = useNavigate();

  useEffect(() => {
    const refresh = () => {
      void refetch();
    };
    window.addEventListener(SIMULATION_DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SIMULATION_DATA_CHANGED_EVENT, refresh);
  }, [refetch]);

  const handleNavigate = (path: string) => {
    navigate(path);
  };


  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Command Center
          </h1>
          <p className="text-sm text-zinc-600 mt-0.5">
            Operations overview · required-actions feed
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void refetch()}
          disabled={isLoading}
          className="gap-1.5"
        >
          <RefreshCw
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
          />
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <Card className="relative overflow-hidden border-zinc-900 bg-zinc-950 text-white shadow-[6px_6px_0px_0px_rgba(161,161,170,0.45)]">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-emerald-400/20 to-transparent" aria-hidden="true" />
        <CardContent className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Live operations brief</p>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Keep the warehouse moving.</h2>
            <p className="mt-2 text-sm text-zinc-300">Monitor risk, prioritize decisions, and resolve the next constraint from one command surface.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={() => navigate('/orders')} className="bg-white text-zinc-950 hover:bg-zinc-200">View orders</Button>
            <Button variant="secondary" onClick={() => navigate('/simulate')} className="border border-zinc-600 bg-transparent text-white hover:bg-zinc-800">Simulate event</Button>
          </div>
        </CardContent>
      </Card>


      {/* Error Banner */}
      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                Unable to load Command Center data.
              </p>
              {error ? (
                <p className="text-xs text-red-600 mt-1 font-mono truncate">
                  {error}
                </p>
              ) : null}
            </div>
            <Button
              variant="danger"
              onClick={() => void refetch()}
              className="px-3 py-1.5 text-xs"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* KPIs */}
      {isLoading && !data ? (
        <SkeletonKpiRow />
      ) : data ? (
        <KpiGrid kpis={data.kpis} />
      ) : null}

      {/* Middle: Bottlenecks (L) + Exceptions / Actions (R) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column: Bottlenecks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
                Stage Bottlenecks
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Current queue pressure by fulfillment stage
              </p>
            </div>
            <Badge variant="neutral">Top {data?.top_bottlenecks?.length ?? 0}</Badge>
          </div>
          {isLoading && !data ? (
            <SkeletonBottlenecks />
          ) : data ? (
            <BottlenecksPanel items={data.top_bottlenecks} />
          ) : null}
        </div>

        {/* Right column: Exceptions + Top Actions */}
        <div className="space-y-5">
          {/* Top Exceptions */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-zinc-900">
                    Exception Alerts
                  </CardTitle>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Open exceptions requiring review
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => handleNavigate('/exceptions')}
                  className="px-2.5 py-1.5 text-xs"
                >
                  All Exceptions
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && !data ? (
                <SkeletonList count={2} />
              ) : data ? (
                <ExceptionsPanel
                  items={data.top_exceptions}
                  onNavigate={handleNavigate}
                />
              ) : null}
            </CardContent>
          </Card>

          {/* Top Actions (required-actions feed per UI direction) */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-zinc-900">
                    Required Actions
                  </CardTitle>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Decisions requiring operator attention
                  </p>
                </div>
                <Badge variant="active">
                  {data?.top_actions?.length ?? 0} open
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && !data ? (
                <SkeletonList count={3} />
              ) : data ? (
                <TopActionsPanel
                  items={data.top_actions}
                  onNavigate={handleNavigate}
                />
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
