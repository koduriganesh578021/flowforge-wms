import { useEffect, useState } from 'react';
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
  Zap,
  Sparkles,
  ChevronDown,
  Layers,
  ShieldCheck,
} from 'lucide-react';

/* ===== Severity helpers ===== */

const SEVERITY_BADGE_VAR: Record<string, 'critical' | 'warning' | 'success' | 'neutral'> = {
  HIGH: 'critical',
  MEDIUM: 'warning',
  LOW: 'success',
};

const SEVERITY_BORDER: Record<string, string> = {
  HIGH: 'border-l-rose-500 bg-rose-950/20',
  MEDIUM: 'border-l-amber-500 bg-amber-950/20',
  LOW: 'border-l-emerald-500 bg-emerald-950/20',
};

const PRIORITY_BADGE_VAR: Record<string, 'critical' | 'warning' | 'success' | 'neutral'> = {
  HIGH: 'critical',
  MEDIUM: 'warning',
  LOW: 'success',
};

const ACTION_ICON_VAR: Record<string, string> = {
  REORDER: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  EXCEPTION_REVIEW: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  ALLOCATE_ORDER: 'bg-[#f9b17a]/20 text-[#f9b17a] border border-[#f9b17a]/30',
};

/* ===== Skeleton components ===== */

function SkeletonKpiRow() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-busy="true" aria-label="Loading KPIs">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="glass-card">
          <CardContent className="p-5 space-y-3">
            <div className="h-4 w-28 bg-[#424769] rounded animate-pulse" />
            <div className="h-7 w-16 bg-[#424769] rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SkeletonBottlenecks() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading bottlenecks">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="glass-card">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-40 bg-[#424769] rounded animate-pulse" />
              <div className="h-5 w-14 bg-[#424769] rounded animate-pulse" />
            </div>
            <div className="h-3 w-56 bg-[#424769]/60 rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SkeletonList({ count }: { count: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 border border-[#424769]/50 rounded-2xl bg-[#2d3250]/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-56 bg-[#424769] rounded animate-pulse" />
            <div className="h-5 w-14 bg-[#424769] rounded animate-pulse" />
          </div>
          <div className="h-3 w-48 bg-[#424769]/60 rounded animate-pulse" />
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
  badgeVariant?: 'critical' | 'warning' | 'success' | 'neutral' | 'active';
  badgeLabel?: string;
  icon: React.ReactNode;
}

function KpiCard({
  label,
  value,
  unit,
  badgeVariant,
  badgeLabel,
  icon,
}: KpiCardProps) {
  const display = value === null || value === undefined ? '—' : value;
  return (
    <Card className="glass-card relative overflow-hidden group hover:border-[#f9b17a]/50">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#676f9d] via-[#f9b17a] to-[#2d3250]" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#d1d5db] font-semibold uppercase tracking-wider flex items-center gap-1.5 font-heading">
              <span className="text-[#f9b17a]" aria-hidden="true">{icon}</span>
              {label}
            </p>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                {display}
              </span>
              {unit ? (
                <span className="text-xs text-[#9ba3c9] font-mono font-medium">{unit}</span>
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
      badgeVariant: 'active',
      badgeLabel: 'Active Pipeline',
      icon: <ShoppingCart className="w-3.5 h-3.5" />,
    },
    {
      label: 'Critical Orders',
      value: kpis.critical_orders,
      badgeVariant: kpis.critical_orders > 0 ? 'critical' : 'neutral',
      badgeLabel: kpis.critical_orders > 0 ? 'Urgent Attention' : 'Queue Clear',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
    {
      label: 'Low-Stock SKUs',
      value: kpis.low_stock_skus,
      badgeVariant: kpis.low_stock_skus > 0 ? 'warning' : 'success',
      badgeLabel: kpis.low_stock_skus > 0 ? 'Stock Alert' : 'Stock Optimal',
      icon: <Warehouse className="w-3.5 h-3.5" />,
    },
    {
      label: 'Open Exceptions',
      value: kpis.open_exceptions,
      badgeVariant: kpis.open_exceptions > 0 ? 'critical' : 'success',
      badgeLabel: kpis.open_exceptions > 0 ? 'Review Needed' : 'No Disruptions',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <KpiCard key={i} {...c} />
      ))}
      {kpis.average_fulfillment_time_minutes !== null &&
      kpis.average_fulfillment_time_minutes !== undefined ? (
        <KpiCard
          label="Avg Fulfillment"
          value={kpis.average_fulfillment_time_minutes.toFixed(1)}
          unit="min"
          badgeVariant="success"
          badgeLabel="On Track"
          icon={<Gauge className="w-3.5 h-3.5" />}
        />
      ) : null}
    </div>
  );
}

/* ===== Bottlenecks Panel ===== */

function BottlenecksPanel({ items }: { items: BottleneckSummary[] }) {
  if (items.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-[#9ba3c9]">
            ✓ No stage bottlenecks detected — all warehouse queues operating within optimal thresholds.
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
      <div className="p-5 border border-emerald-500/30 rounded-2xl bg-emerald-500/10 text-emerald-300">
        <p className="text-sm font-semibold">
          ✓ No open exception alerts. Warehouse operating within policy.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.slice(0, 3).map((e) => {
        const target = exceptionNavigateTarget(e);
        return (
          <button
            type="button"
            key={e.id}
            onClick={() => onNavigate(target)}
            aria-label={`View exception #${e.id}: ${e.summary}`}
            className={`w-full text-left p-4 rounded-2xl border-l-4 ${SEVERITY_BORDER[e.severity] ?? 'border-l-[#676f9d] bg-[#2d3250]/70'} border border-[#424769]/50 hover:border-[#f9b17a]/50 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#f9b17a]`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-[11px] text-[#9ba3c9]">
                    #{e.id}
                  </span>
                  <Badge variant={SEVERITY_BADGE_VAR[e.severity] ?? 'neutral'}>
                    {formatEventType(e.event_type)}
                  </Badge>
                </div>
                <p className="text-sm font-bold text-white group-hover:text-[#f9b17a] transition-colors leading-snug font-heading">
                  {e.summary}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-[#d1d5db] font-mono">
                  {e.context?.order_id ? (
                    <span className="bg-[#16192b] px-2 py-0.5 rounded-md border border-[#424769]">Order #{e.context.order_id}</span>
                  ) : null}
                  {e.context?.sku_id ? (
                    <span className="bg-[#16192b] px-2 py-0.5 rounded-md border border-[#424769]">SKU #{e.context.sku_id}</span>
                  ) : null}
                  {e.context?.location_id ? (
                    <span className="bg-[#16192b] px-2 py-0.5 rounded-md border border-[#424769]">Bin #{e.context.location_id}</span>
                  ) : null}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#9ba3c9] group-hover:text-[#f9b17a] group-hover:translate-x-1 transition-all shrink-0 mt-1" aria-hidden="true" />
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
      <div className="p-6 border border-[#424769]/50 rounded-2xl bg-[#2d3250]/60 text-center">
        <p className="text-sm text-[#9ba3c9]">
          ✓ No manual operator actions required at this time.
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {items.slice(0, 5).map((a, i) => {
        const target = actionNavigateTarget(a);
        const iconColor = ACTION_ICON_VAR[a.action_type] ?? 'bg-[#424769] text-white';
        return (
          <li
            key={i}
            className={`p-4 rounded-2xl border-l-4 ${SEVERITY_BORDER[a.priority] ?? 'border-l-[#676f9d]'} border border-[#424769]/50 bg-[#2d3250]/70`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-bold ${iconColor}`}>
                    <Package className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                  <Badge variant={PRIORITY_BADGE_VAR[a.priority] ?? 'neutral'}>
                    Priority: {a.priority}
                  </Badge>
                  <span className="text-[10px] uppercase tracking-wider text-[#9ba3c9] font-bold font-mono">
                    {a.action_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm font-bold text-white font-mono leading-snug">
                  {a.title}
                </p>
                <p className="text-xs text-[#d1d5db] mt-1 leading-relaxed">
                  {a.description}
                </p>
              </div>
              <Button
                variant="secondary"
                aria-label={`${actionLabel(a.action_type)}: ${a.title}`}
                className="shrink-0 px-3 py-1.5 text-xs font-bold"
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

/* ===== Main Dashboard Component ===== */

export function Dashboard() {
  const { data, isLoading, error, refetch } = useCommandCenter();
  const navigate = useNavigate();
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  useEffect(() => {
    const refresh = () => {
      void refetch().then(() => {
        setLiveAnnouncement('Command center data refreshed.');
      });
    };
    window.addEventListener(SIMULATION_DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SIMULATION_DATA_CHANGED_EVENT, refresh);
  }, [refetch]);

  const scrollToCommandCenter = () => {
    const el = document.getElementById('command-center');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      el.focus();
    }
  };

  const handleRefresh = async () => {
    await refetch();
    setLiveAnnouncement('Command center telemetry updated.');
  };

  return (
    <div className="w-full">
      {/* Polite Live Announcement */}
      <div className="sr-only" aria-live="polite" role="status">
        {liveAnnouncement}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: IMMERSIVE INTRODUCTION HERO */}
      {/* ========================================================================= */}
      <section id="intro" aria-label="Introduction" className="min-h-[85vh] flex flex-col justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-12 lg:py-16">
        <div className="flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto mt-4">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2d3250] border border-[#424769] text-[#f9b17a] text-xs font-bold tracking-wider uppercase shadow-md shadow-[#f9b17a]/5">
            <Sparkles className="w-4 h-4 text-[#f9b17a]" aria-hidden="true" />
            <span>Autonomous Decision Intelligence for Modern Warehouses</span>
          </div>

          {/* Main Hero Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-tight font-heading">
            Zero-Bottleneck <br />
            <span className="text-[#f9b17a] drop-shadow-sm">Fulfillment Orchestration.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-[#d1d5db] max-w-2xl font-medium leading-relaxed">
            FlowForge solves complex warehouse constraints in real time — automating dynamic SKU allocation, pick sequencing, and instant disruption recovery.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button
              variant="primary"
              size="large"
              onClick={scrollToCommandCenter}
              aria-label="Explore Command Center section below"
              suffix={<ChevronDown className="w-5 h-5 text-[#16192b] animate-bounce" aria-hidden="true" />}
              className="text-base px-8 py-3.5 shadow-xl shadow-[#f9b17a]/25"
            >
              Explore Command Center
            </Button>
            <Button
              variant="secondary"
              size="large"
              onClick={() => navigate('/simulate')}
              aria-label="Simulate Disruption in Scenario Simulator"
              className="text-base px-6 py-3.5"
            >
              <Zap className="w-4 h-4 text-[#f9b17a] mr-2" aria-hidden="true" />
              Simulate Disruption
            </Button>
          </div>
        </div>

        {/* 3 Core Architecture Showcase Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="p-6 rounded-2xl bg-[#2d3250]/70 border border-[#424769]/50 backdrop-blur-xl hover:border-[#f9b17a]/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#16192b] flex items-center justify-center border border-[#424769] text-[#f9b17a] mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 fill-[#f9b17a]" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-white font-heading">Dynamic SLA Prioritization</h2>
            <p className="text-xs text-[#d1d5db] mt-2 leading-relaxed font-medium">
              Multi-variable priority algorithms score order deadlines, customer tiers (VIP, Enterprise), and carrier dispatch cutoff times continuously.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#2d3250]/70 border border-[#424769]/50 backdrop-blur-xl hover:border-[#f9b17a]/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#16192b] flex items-center justify-center border border-[#424769] text-[#f9b17a] mb-4 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-white font-heading">Constraint-Aware Bin Allocation</h2>
            <p className="text-xs text-[#d1d5db] mt-2 leading-relaxed font-medium">
              Optimizes pick paths and bin reservations to minimize worker transit time and eliminate physical stage bottlenecks across picking and packing.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#2d3250]/70 border border-[#424769]/50 backdrop-blur-xl hover:border-[#f9b17a]/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#16192b] flex items-center justify-center border border-[#424769] text-[#f9b17a] mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-white font-heading">Instant Disruption Healing</h2>
            <p className="text-xs text-[#d1d5db] mt-2 leading-relaxed font-medium">
              When damaged goods or missing stock events occur, alternate source bins are auto-allocated without halting the overall order pipeline.
            </p>
          </div>
        </div>

        {/* Scroll down prompt */}
        <div className="flex flex-col items-center justify-center pt-10 text-center">
          <button
            type="button"
            onClick={scrollToCommandCenter}
            aria-label="Scroll down into live Command Center"
            className="flex flex-col items-center gap-1.5 text-xs text-[#9ba3c9] hover:text-[#f9b17a] transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#f9b17a] rounded-lg p-1"
          >
            <span className="font-semibold tracking-wider uppercase text-[10px]">Scroll to enter live Command Center</span>
            <div className="w-8 h-8 rounded-full bg-[#2d3250] border border-[#424769] flex items-center justify-center group-hover:border-[#f9b17a]/50">
              <ChevronDown className="w-4 h-4 text-[#f9b17a] animate-bounce" aria-hidden="true" />
            </div>
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: LIVE OPERATIONAL COMMAND CENTER */}
      {/* ========================================================================= */}
      <section
        id="command-center"
        tabIndex={-1}
        aria-label="Live Operational Command Center"
        className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 pb-16 focus:outline-none"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#424769]/50 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f9b17a] animate-ping" aria-hidden="true" />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
                Operational Command Center
              </h2>
            </div>
            <p className="text-xs text-[#9ba3c9] mt-1 font-medium">
              Live warehouse telemetry • Queue constraint solver & required-actions feed
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => void handleRefresh()}
            disabled={isLoading}
            aria-label="Refresh telemetry metrics"
            className="gap-2 shrink-0 shadow-md"
          >
            <RefreshCw
              className={`w-4 h-4 text-[#f9b17a] ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isLoading ? 'Refreshing…' : 'Refresh Telemetry'}
          </Button>
        </div>

        {/* Transparent Demo Environment & Decision Engine Info */}
        <div className="p-3.5 rounded-xl bg-[#2d3250]/60 border border-[#424769]/50 flex items-center justify-between gap-3 text-xs text-[#d1d5db]">
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#f9b17a] shrink-0" aria-hidden="true" />
            <span>
              <strong className="text-white">Demo environment:</strong> Change warehouse facts through{' '}
              <button
                type="button"
                onClick={() => navigate('/simulate')}
                className="text-[#f9b17a] font-bold underline hover:text-[#fa9d58] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#f9b17a] rounded px-0.5"
              >
                Simulate Event
              </button>{' '}
              and FlowForge recalculates operational recommendations in real time.
            </span>
          </p>
        </div>

        {/* Error Banner */}
        {error ? (
          <div role="alert" aria-live="assertive">
            <Card className="border-rose-500/40 bg-rose-950/40 text-rose-200">
              <CardContent className="p-5 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-bold text-rose-300">
                    Unable to load Command Center data.
                  </p>
                  <p className="text-xs text-rose-400 mt-1 font-mono">
                    {error}
                  </p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => void handleRefresh()}
                  className="px-3 py-1.5 text-xs"
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* KPIs Grid */}
        {isLoading && !data ? (
          <SkeletonKpiRow />
        ) : data ? (
          <KpiGrid kpis={data.kpis} />
        ) : null}

        {/* Stage Bottlenecks (Left) + Exception Alerts & Actions (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column: Stage Bottlenecks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
                  Stage Bottlenecks
                </h3>
                <p className="text-xs text-[#9ba3c9] mt-0.5">
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

          {/* Right column: Exception Alerts + Required Actions */}
          <div className="space-y-6">
            {/* Top Exception Alerts */}
            <Card className="glass-card">
              <CardHeader className="pb-3 border-b border-[#424769]/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-white font-heading">
                      Exception Alerts
                    </CardTitle>
                    <p className="text-xs text-[#9ba3c9] mt-0.5 font-medium">
                      Disruptions requiring operator review
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/exceptions')}
                    aria-label="View all exceptions feed"
                    className="px-3 py-1.5 text-xs"
                  >
                    All Exceptions
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {isLoading && !data ? (
                  <SkeletonList count={2} />
                ) : data ? (
                  <ExceptionsPanel
                    items={data.top_exceptions}
                    onNavigate={(p) => navigate(p)}
                  />
                ) : null}
              </CardContent>
            </Card>

            {/* Required Actions Feed */}
            <Card className="glass-card">
              <CardHeader className="pb-3 border-b border-[#424769]/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-white font-heading">
                      Required Actions
                    </CardTitle>
                    <p className="text-xs text-[#9ba3c9] mt-0.5 font-medium">
                      Recommended interventions from decision engine
                    </p>
                  </div>
                  <Badge variant="active">
                    {data?.top_actions?.length ?? 0} open actions
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {isLoading && !data ? (
                  <SkeletonList count={3} />
                ) : data ? (
                  <TopActionsPanel
                    items={data.top_actions}
                    onNavigate={(p) => navigate(p)}
                  />
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

