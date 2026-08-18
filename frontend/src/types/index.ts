export type OrderStatus = 
  | "Created" 
  | "Prioritized" 
  | "Awaiting Allocation" 
  | "Partially Allocated" 
  | "Allocated" 
  | "Ready to Pick" 
  | "Picking" 
  | "Picked" 
  | "Packing" 
  | "Quality Check" 
  | "Ready to Dispatch" 
  | "Dispatched" 
  | "Awaiting Stock" 
  | "Backordered" 
  | "Exception Review" 
  | "Rework Required" 
  | "Cancelled";

export interface Order {
  id: number;
  order_code: string;
  customer_name: string;
  status: OrderStatus;
  priority_score: number | null;
  priority_label: string | null;
  risk_status: string | null;
  due_at: string | null;
  updated_at?: string;
  stage_entered_at?: string;
}

export interface OrderItem {
  id: number;
  sku_id: number;
  quantity_requested: number;
  quantity_allocated: number;
  quantity_picked: number;
  quantity_dispatched: number;
  unfulfilled_at_allocation: number;
  remaining_to_ship: number;
}

export interface PickTask {
  id: number;
  order_item_id: number;
  source_location_id: number;
  quantity_required: number;
  quantity_confirmed: number;
  sequence: number | null;
  status: string;
  assigned_worker: string | null;
}

export interface PriorityExplanation {
  score: number;
  label: string;
  risk_flag: string;
  reasons: string[];
}

export interface OrderDetail extends Order {
  items: OrderItem[];
  pick_tasks: PickTask[];
  priority_explanation: PriorityExplanation | null;
  status_history?: StatusTimelineEvent[];
}

export interface PriorityResponse {
  order_id: number;
  score: number;
  label: string;
  risk_flag: string;
  reasons: string[];
  decision_id: number;
}

export interface BinAllocation {
  location_id: number;
  location_code: string;
  quantity_taken: number;
  verification_status: string;
  confidence_score: number;
}

export interface AllocationLine {
  order_item_id: number;
  sku_id: number;
  quantity_requested: number;
  quantity_allocated_before: number;
  quantity_allocated_after: number;
  quantity_newly_allocated: number;
  quantity_unfulfilled: number;
  line_status: string;
  source_bins: BinAllocation[];
  explanation: string;
}

export interface AllocationOrder {
  order_id: number;
  previous_status: string;
  new_status: string;
  explanation: string;
  lines: AllocationLine[];
}

export interface Shortage {
  sku_id: number;
  total_unfulfilled_across_orders: number;
  affected_order_ids: number[];
  suggested_reorder_quantity: number | null;
  explanation: string;
}

export interface AllocationDecision {
  decision_id: number;
  type: string;
  sku_id: number;
  from_order_id: number;
  to_order_id: number;
  quantity_candidate: number;
  status: string;
  explanation: string;
}

export interface AllocationResponse {
  order: AllocationOrder;
  unresolved_shortages: Shortage[];
  decisions_created: AllocationDecision[];
  confidence_recommendations: string[];
}

export interface InventoryItem {
  sku_id: number;
  sku_code: string;
  name: string;
  on_hand: number;
  allocated: number;
  damaged: number;
  available_stock: number;
  reorder_point: number | null;
  demand_from_open_orders: number;
  projected_stock: number;
  target_stock: number | null;
  suggested_reorder: number | null;
  status: string;
  explanation: string;
  data_quality_issue: string | null;
  decision_id: number | null;
}

// Exception and event payload types. These are type-only exports and must be
// imported with `import type` so Vite does not look for runtime JS exports.
export type EventType = 'ITEM_DAMAGED' | 'ITEM_MISSING' | 'QC_FAILED' | 'INVENTORY_DISCREPANCY';

export interface EventPayload {
  event_type: EventType;
  sku_id: number;
  quantity: number;
  location_id?: number;
  order_id?: number;
  notes?: string;
  failure_reason?: string; // For QC_FAILED
}

export type DecisionMode = 'AUTO_EXECUTED' | 'APPROVAL_REQUIRED' | 'ESCALATE';
export type SimulateEventType = 'NEW_URGENT_ORDER' | 'ITEM_DAMAGED' | 'ITEM_MISSING' | 'QC_FAILURE';
export type SimulationDecisionMode = DecisionMode | 'auto_executed' | 'approval_required' | 'escalate';
export interface SimulateEventRequest { event_type: SimulateEventType; sku_id?: number; quantity?: number; bin_id?: number; order_id?: number; customer_name?: string; due_at?: string; note?: string; }
export interface SimulationInventoryChange { sku_id: number; bin_id: number; field: string; before: number; after: number; }
export interface SimulateEventResponse { event_type: SimulateEventType; summary: { created_order_id?: number; event_id?: number; decision_mode?: SimulationDecisionMode; affected_order_ids?: number[]; inventory_changes?: SimulationInventoryChange[]; initial_allocation_status?: string; priority_score?: number; priority_label?: string; new_order_status?: string; explanation: string; }; }

export interface DecisionResponse {
  decision_id: number;
  decision_mode: DecisionMode;
  explanation: string;
  event_type: EventType;
  timestamp: string;
  // Additional fields based on decision
  alternate_bin_suggestion?: {
    location_id: number;
    location_code: string;
    quantity_available: number;
  };
  cycle_count_task_id?: number;
  replacement_pick_task_id?: number;
}

export interface ExceptionEvent {
  id: number;
  event_type: EventType;
  sku_id: number;
  quantity: number;
  location_id?: number;
  order_id?: number;
  notes?: string;
  resolution_note?: string;
  decision_mode: DecisionMode;
  explanation: string;
  timestamp: string;
  status: string; // e.g., 'Pending', 'Resolved', 'Escalated'
}

export interface ResolveExceptionRequest {
  actor?: string;
  note?: string;
}

// Valid transitions for each status
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  "Created": ["Prioritized"],
  "Prioritized": ["Awaiting Allocation"],
  "Awaiting Allocation": ["Partially Allocated", "Allocated"],
  "Partially Allocated": ["Allocated", "Awaiting Stock"],
  "Allocated": ["Ready to Pick"],
  "Ready to Pick": ["Picking"],
  "Picking": ["Picked"],
  "Picked": ["Packing"],
  "Packing": ["Quality Check"],
  "Quality Check": ["Ready to Dispatch", "Rework Required"],
  "Ready to Dispatch": ["Dispatched"],
  "Dispatched": [], // Terminal state
  "Awaiting Stock": ["Backordered", "Allocated"],
  "Backordered": ["Allocated", "Cancelled"],
  "Exception Review": ["Rework Required", "Cancelled"],
  "Rework Required": ["Ready to Pick", "Cancelled"],
  "Cancelled": [], // Terminal state
};

// UI actions mapping - what buttons to show for each status
export interface StatusAction {
  label: string;
  action: string;
  variant: 'primary' | 'secondary' | 'danger';
}

export const STATUS_ACTIONS: Record<OrderStatus, StatusAction[]> = {
  "Ready to Pick": [
    { label: "Start Picking", action: "start_picking", variant: "primary" as const }
  ],
  "Picking": [
    { label: "Confirm Picked", action: "confirm_picked", variant: "primary" as const }
  ],
  "Picked": [
    { label: "Confirm Packed", action: "confirm_packed", variant: "primary" as const }
  ],
  "Packing": [
    { label: "Send to QC", action: "send_to_qc", variant: "primary" as const }
  ],
  "Quality Check": [
    { label: "QC Pass", action: "qc_pass", variant: "primary" as const },
    { label: "QC Fail", action: "qc_fail", variant: "danger" as const }
  ],
  "Ready to Dispatch": [
    { label: "Dispatch", action: "dispatch", variant: "primary" as const }
  ],
  // Other statuses have no actions or will be handled separately
  "Created": [],
  "Prioritized": [],
  "Awaiting Allocation": [],
  "Partially Allocated": [],
  "Allocated": [],
  "Dispatched": [],
  "Awaiting Stock": [],
  "Backordered": [],
  "Exception Review": [],
  "Rework Required": [],
  "Cancelled": [],
};

// Status timeline event type
export interface StatusTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  actor?: string;
}

// Fulfillment board column configuration
export interface FulfillmentColumn {
  id: string;
  title: string;
  statuses: OrderStatus[];
}

// Fulfillment board columns
export const FULFILLMENT_COLUMNS: FulfillmentColumn[] = [
  {
    id: "ready_to_pick",
    title: "Ready to Pick",
    statuses: ["Ready to Pick"]
  },
  {
    id: "picking",
    title: "Picking",
    statuses: ["Picking"]
  },
  {
    id: "packed",
    title: "Packed",
    statuses: ["Picked", "Packing"]
  },
  {
    id: "quality_check",
    title: "Quality Check",
    statuses: ["Quality Check"]
  },
  {
    id: "ready_to_dispatch",
    title: "Ready to Dispatch",
    statuses: ["Ready to Dispatch"]
  },
  {
    id: "dispatched",
    title: "Dispatched",
    statuses: ["Dispatched"]
  }
];

// Dashboard analytics types
export interface DashboardSummary {
  pending_orders: number;
  critical_orders: number;
  low_stock_skus: number;
  open_exceptions: number;
  average_fulfillment_time?: number; // in minutes
  top_bottlenecks: Bottleneck[];
}

export interface Bottleneck {
  stage: string;
  queue_size: number;
  average_wait_minutes: number;
  severity: "HIGH" | "MEDIUM" | "LOW";
  recommendation: string;
  capacity_orders_per_hour?: number;
  incoming_rate_orders_per_hour?: number;
}

// ===== Command Center Types =====

export interface DashboardKPIs {
  pending_orders: number;
  critical_orders: number;
  low_stock_skus: number;
  open_exceptions: number;
  average_fulfillment_time_minutes: number | null;
}

export interface BottleneckSummary {
  stage: string;
  queue_size: number;
  average_wait_minutes: number;
  severity: "HIGH" | "MEDIUM" | "LOW";
  recommendation: string;
}

export interface ExceptionAlert {
  id: number;
  event_type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  summary: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: Record<string, any>;
  created_at: string;
}

export type TopActionType = "REORDER" | "EXCEPTION_REVIEW" | "ALLOCATE_ORDER" | string;

export interface TopAction {
  action_type: TopActionType;
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: Record<string, any>;
}

export interface CommandCenterResponse {
  kpis: DashboardKPIs;
  top_bottlenecks: BottleneckSummary[];
  top_exceptions: ExceptionAlert[];
  top_actions: TopAction[];
}
