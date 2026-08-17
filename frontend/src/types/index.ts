export interface Order {
  id: number;
  order_code: string;
  customer_name: string;
  status: string;
  priority_score: number | null;
  priority_label: string | null;
  risk_status: string | null;
  due_at: string | null;
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
export type EventType = 'ITEM_DAMAGED' | 'ITEM_MISSING' | 'QC_FAILED';

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
  decision_mode: DecisionMode;
  explanation: string;
  timestamp: string;
  status: string; // e.g., 'Pending', 'Resolved', 'Escalated'
}
