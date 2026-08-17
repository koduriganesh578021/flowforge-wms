// API Types based on backend Swagger documentation
// TODO: Verify exact response shapes from running Swagger docs

export interface Order {
  id: number;
  order_code: string;
  customer_name: string;
  customer_tier: 'VIP' | 'Business' | 'Standard';
  shipping_type: 'Same-Day' | 'Express' | 'Standard';
  created_at: string;
  due_at: string | null;
  order_value: number;
  status: string;
  priority_score: number | null;
  priority_label: string | null;
  risk_status: string | null;
  stage_entered_at: string | null;
}

export interface OrderItem {
  id: number;
  order_id: number;
  sku_id: number;
  quantity_requested: number;
  quantity_allocated: number;
  quantity_picked: number;
  quantity_dispatched: number;
  // quantity_unfulfilled is computed: requested - dispatched
}

export interface OrderDetail extends Order {
  items: OrderItem[];
}

export interface PriorityResponse {
  order_id: number;
  priority: {
    score: number;
    label: string;
    reasons: string[];
  };
}

export interface AllocationLine {
  sku_id: number;
  quantity_requested: number;
  quantity_allocated_after: number;
  quantity_unfulfilled: number;
}

export interface AllocationOrder {
  id: number;
  order_code: string;
  lines: AllocationLine[];
}

export interface AllocationResponse {
  order_id: number;
  priority: {
    score: number;
    label: string;
    reasons: string[];
  };
  order: AllocationOrder;
}

// TODO: Add more types as needed based on actual API responses
