{
  "_meta": {
    "reference_now": "2026-08-16T15:00:00+05:30",
    "timezone": "Asia/Kolkata",
    "note": "12 orders fixed in Packing left only 3 slots for the other 5 states, so total orders expanded from 15 to 18 to give Created, Allocated, Picking, QC and Dispatched at least one real example each. No decisions/resolutions are included — only facts an engine would consume."
  },

  "products": [
    { "id": 1,  "sku_code": "SKU-101", "name": "Wireless Mouse",              "category": "Electronics", "reorder_point": 20, "target_stock": 80,  "unit_of_measure": "unit" },
    { "id": 2,  "sku_code": "SKU-102", "name": "USB-C Charging Cable 1m",     "category": "Electronics", "reorder_point": 30, "target_stock": 200, "unit_of_measure": "unit" },
    { "id": 3,  "sku_code": "SKU-103", "name": "Bluetooth Speaker Mini",      "category": "Electronics", "reorder_point": 15, "target_stock": 70,  "unit_of_measure": "unit" },
    { "id": 4,  "sku_code": "SKU-104", "name": "Laptop Sleeve 14-inch",       "category": "Accessories", "reorder_point": 10, "target_stock": 60,  "unit_of_measure": "unit" },
    { "id": 5,  "sku_code": "SKU-105", "name": "Wireless Earbuds",            "category": "Electronics", "reorder_point": 15, "target_stock": 50,  "unit_of_measure": "unit" },
    { "id": 6,  "sku_code": "SKU-106", "name": "Phone Case - Universal",      "category": "Accessories", "reorder_point": 20, "target_stock": 120, "unit_of_measure": "unit" },
    { "id": 7,  "sku_code": "SKU-107", "name": "Power Bank 10000mAh",         "category": "Electronics", "reorder_point": 12, "target_stock": 60,  "unit_of_measure": "unit" },
    { "id": 8,  "sku_code": "SKU-108", "name": "HDMI Cable 2m",               "category": "Electronics", "reorder_point": 15, "target_stock": 40,  "unit_of_measure": "unit" },
    { "id": 9,  "sku_code": "SKU-109", "name": "Desk Lamp LED",               "category": "Home",        "reorder_point": 8,  "target_stock": 35,  "unit_of_measure": "unit" },
    { "id": 10, "sku_code": "SKU-110", "name": "Notebook A5 Ruled",           "category": "Stationery",  "reorder_point": 10, "target_stock": 40,  "unit_of_measure": "unit" },
    { "id": 11, "sku_code": "SKU-111", "name": "Ballpoint Pen Pack (10)",     "category": "Stationery",  "reorder_point": 25, "target_stock": 150, "unit_of_measure": "unit" },
    { "id": 12, "sku_code": "SKU-112", "name": "Water Bottle 1L",             "category": "Home",        "reorder_point": 15, "target_stock": 80,  "unit_of_measure": "unit" },
    { "id": 13, "sku_code": "SKU-113", "name": "Yoga Mat",                    "category": "Fitness",     "reorder_point": 8,  "target_stock": 40,  "unit_of_measure": "unit" },
    { "id": 14, "sku_code": "SKU-114", "name": "Resistance Bands Set",        "category": "Fitness",     "reorder_point": 10, "target_stock": 55,  "unit_of_measure": "unit" },
    { "id": 15, "sku_code": "SKU-115", "name": "Kitchen Scale Digital",       "category": "Home",        "reorder_point": 6,  "target_stock": 25,  "unit_of_measure": "unit" },
    { "id": 16, "sku_code": "SKU-116", "name": "Cutting Board Set",           "category": "Home",        "reorder_point": 8,  "target_stock": 30,  "unit_of_measure": "unit" },
    { "id": 17, "sku_code": "SKU-117", "name": "Backpack 20L",                "category": "Accessories", "reorder_point": 10, "target_stock": 45,  "unit_of_measure": "unit" },
    { "id": 18, "sku_code": "SKU-118", "name": "Wireless Keyboard",           "category": "Electronics", "reorder_point": 12, "target_stock": 60,  "unit_of_measure": "unit" },
    { "id": 19, "sku_code": "SKU-119", "name": "Webcam HD 1080p",             "category": "Electronics", "reorder_point": 10, "target_stock": 35,  "unit_of_measure": "unit" },
    { "id": 20, "sku_code": "SKU-120", "name": "Monitor Stand Riser",         "category": "Accessories", "reorder_point": 12, "target_stock": 50,  "unit_of_measure": "unit" }
  ],

  "locations": [
    { "id": 1, "warehouse": "WH1", "zone": "A", "aisle": "01", "rack": "01", "bin": "01", "location_code": "A-01-01" },
    { "id": 2, "warehouse": "WH1", "zone": "A", "aisle": "01", "rack": "02", "bin": "01", "location_code": "A-01-02" },
    { "id": 3, "warehouse": "WH1", "zone": "A", "aisle": "02", "rack": "01", "bin": "01", "location_code": "A-02-01" },
    { "id": 4, "warehouse": "WH1", "zone": "B", "aisle": "01", "rack": "01", "bin": "01", "location_code": "B-01-01" },
    { "id": 5, "warehouse": "WH1", "zone": "B", "aisle": "01", "rack": "02", "bin": "01", "location_code": "B-01-02" },
    { "id": 6, "warehouse": "WH1", "zone": "B", "aisle": "02", "rack": "01", "bin": "01", "location_code": "B-02-01" }
  ],

  "inventory": [
    { "id": 1,  "sku_id": 1,  "location_id": 1, "on_hand": 12,  "allocated": 5,  "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30", "_note": "available = 12-5-0 = 7" },
    { "id": 2,  "sku_id": 2,  "location_id": 1, "on_hand": 150, "allocated": 20, "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30" },
    { "id": 3,  "sku_id": 3,  "location_id": 2, "on_hand": 60,  "allocated": 10, "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30" },
    { "id": 4,  "sku_id": 4,  "location_id": 2, "on_hand": 40,  "allocated": 5,  "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30" },
    { "id": 5,  "sku_id": 5,  "location_id": 3, "on_hand": 20,  "allocated": 8,  "picked": 0, "damaged": 2, "verification_status": "Verified",   "last_verified_at": "2026-08-16T12:00:00+05:30", "_note": "2 units confirmed damaged; see damage_reported event" },
    { "id": 6,  "sku_id": 5,  "location_id": 5, "on_hand": 10,  "allocated": 0,  "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30", "_note": "alternate bin for SKU-105, untouched stock" },
    { "id": 7,  "sku_id": 6,  "location_id": 3, "on_hand": 90,  "allocated": 15, "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30" },
    { "id": 8,  "sku_id": 7,  "location_id": 4, "on_hand": 45,  "allocated": 12, "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30" },
    { "id": 9,  "sku_id": 8,  "location_id": 4, "on_hand": 9,   "allocated": 3,  "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30", "_note": "on_hand 9 < reorder_point 15" },
    { "id": 10, "sku_id": 9,  "location_id": 5, "on_hand": 25,  "allocated": 4,  "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30" },
    { "id": 11, "sku_id": 10, "location_id": 2, "on_hand": 6,   "allocated": 6,  "picked": 0, "damaged": 0, "verification_status": "Needs Count", "last_verified_at": "2026-08-16T14:40:00+05:30", "_note": "system says 6; pick found only 4 — see missing_reported event" },
    { "id": 12, "sku_id": 11, "location_id": 4, "on_hand": 200, "allocated": 30, "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30" },
    { "id": 13, "sku_id": 12, "location_id": 6, "on_hand": 70,  "allocated": 10, "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30" },
    { "id": 14, "sku_id": 13, "location_id": 1, "on_hand": 35,  "allocated": 5,  "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30" },
    { "id": 15, "sku_id": 14, "location_id": 1, "on_hand": 50,  "allocated": 8,  "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30" },
    { "id": 16, "sku_id": 15, "location_id": 6, "on_hand": 18,  "allocated": 2,  "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30" },
    { "id": 17, "sku_id": 16, "location_id": 6, "on_hand": 22,  "allocated": 3,  "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30" },
    { "id": 18, "sku_id": 17, "location_id": 3, "on_hand": 30,  "allocated": 6,  "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30" },
    { "id": 19, "sku_id": 18, "location_id": 5, "on_hand": 55,  "allocated": 9,  "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30" },
    { "id": 20, "sku_id": 19, "location_id": 2, "on_hand": 28,  "allocated": 4,  "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30" },
    { "id": 21, "sku_id": 20, "location_id": 6, "on_hand": 40,  "allocated": 5,  "picked": 0, "damaged": 0, "verification_status": "Verified",   "last_verified_at": "2026-08-16T09:00:00+05:30" }
  ],

  "orders": [
    {
      "id": 1, "order_code": "ORD-1001", "customer_name": "Priya Raghavan", "customer_tier": "VIP", "shipping_type": "Express",
      "order_value": 18999.00, "status": "Created",
      "created_at": "2026-08-16T14:50:00+05:30", "due_at": "2026-08-16T16:30:00+05:30", "current_stage_entered_at": "2026-08-16T14:50:00+05:30",
      "order_items": [ { "id": 11, "sku_id": 1, "quantity_requested": 10, "quantity_allocated": 0, "quantity_picked": 0, "quantity_dispatched": 0, "fulfillment_status": "Pending" } ]
    },
    {
      "id": 2, "order_code": "ORD-1002", "customer_name": "Karthik Reddy", "customer_tier": "Standard", "shipping_type": "Standard",
      "order_value": 8499.00, "status": "Created",
      "created_at": "2026-08-16T12:00:00+05:30", "due_at": "2026-08-17T12:00:00+05:30", "current_stage_entered_at": "2026-08-16T12:00:00+05:30",
      "order_items": [ { "id": 21, "sku_id": 1, "quantity_requested": 5, "quantity_allocated": 0, "quantity_picked": 0, "quantity_dispatched": 0, "fulfillment_status": "Pending" } ]
    },
    {
      "id": 3, "order_code": "ORD-1003", "customer_name": "Ananya Iyer", "customer_tier": "Premium", "shipping_type": "Express",
      "order_value": 649.00, "status": "Picking",
      "created_at": "2026-08-16T13:30:00+05:30", "due_at": "2026-08-16T15:45:00+05:30", "current_stage_entered_at": "2026-08-16T14:35:00+05:30",
      "order_items": [ { "id": 31, "sku_id": 10, "quantity_requested": 6, "quantity_allocated": 6, "quantity_picked": 0, "quantity_dispatched": 0, "fulfillment_status": "Allocated" } ]
    },
    {
      "id": 4, "order_code": "ORD-1004", "customer_name": "Divya Menon", "customer_tier": "Standard", "shipping_type": "Standard",
      "order_value": 2199.00, "status": "Allocated",
      "created_at": "2026-08-16T11:00:00+05:30", "due_at": "2026-08-17T11:00:00+05:30", "current_stage_entered_at": "2026-08-16T14:00:00+05:30",
      "order_items": [ { "id": 41, "sku_id": 7, "quantity_requested": 3, "quantity_allocated": 3, "quantity_picked": 0, "quantity_dispatched": 0, "fulfillment_status": "Allocated" } ]
    },
    {
      "id": 5, "order_code": "ORD-1005", "customer_name": "Farhan Sheikh", "customer_tier": "Premium", "shipping_type": "Express",
      "order_value": 3598.00, "status": "QC",
      "created_at": "2026-08-16T10:00:00+05:30", "due_at": "2026-08-16T16:00:00+05:30", "current_stage_entered_at": "2026-08-16T14:45:00+05:30",
      "order_items": [ { "id": 51, "sku_id": 3, "quantity_requested": 2, "quantity_allocated": 2, "quantity_picked": 2, "quantity_dispatched": 0, "fulfillment_status": "Allocated" } ]
    },
    {
      "id": 6, "order_code": "ORD-1006", "customer_name": "Neha Kapoor", "customer_tier": "Standard", "shipping_type": "Standard",
      "order_value": 1196.00, "status": "Dispatched",
      "created_at": "2026-08-15T15:00:00+05:30", "due_at": "2026-08-16T14:30:00+05:30", "current_stage_entered_at": "2026-08-16T14:00:00+05:30",
      "order_items": [ { "id": 61, "sku_id": 12, "quantity_requested": 4, "quantity_allocated": 4, "quantity_picked": 4, "quantity_dispatched": 4, "fulfillment_status": "Dispatched" } ]
    },
    {
      "id": 7, "order_code": "ORD-1007", "customer_name": "Rohit Sharma", "customer_tier": "Standard", "shipping_type": "Standard",
      "order_value": 798.00, "status": "Packing",
      "created_at": "2026-08-16T10:00:00+05:30", "due_at": "2026-08-16T17:00:00+05:30", "current_stage_entered_at": "2026-08-16T14:14:00+05:30",
      "order_items": [ { "id": 71, "sku_id": 2, "quantity_requested": 2, "quantity_allocated": 2, "quantity_picked": 2, "quantity_dispatched": 0, "fulfillment_status": "Allocated" } ]
    },
    {
      "id": 8, "order_code": "ORD-1008", "customer_name": "Meera Pillai", "customer_tier": "Premium", "shipping_type": "Express",
      "order_value": 2799.00, "status": "Packing",
      "created_at": "2026-08-16T10:30:00+05:30", "due_at": "2026-08-16T15:40:00+05:30", "current_stage_entered_at": "2026-08-16T14:08:00+05:30",
      "order_items": [ { "id": 81, "sku_id": 18, "quantity_requested": 1, "quantity_allocated": 1, "quantity_picked": 1, "quantity_dispatched": 0, "fulfillment_status": "Allocated" } ]
    },
    {
      "id": 9, "order_code": "ORD-1009", "customer_name": "Aditya Verma", "customer_tier": "Standard", "shipping_type": "Standard",
      "order_value": 897.00, "status": "Packing",
      "created_at": "2026-08-16T09:00:00+05:30", "due_at": "2026-08-17T09:00:00+05:30", "current_stage_entered_at": "2026-08-16T14:02:00+05:30",
      "order_items": [ { "id": 91, "sku_id": 6, "quantity_requested": 3, "quantity_allocated": 3, "quantity_picked": 3, "quantity_dispatched": 0, "fulfillment_status": "Allocated" } ]
    },
    {
      "id": 10, "order_code": "ORD-1010", "customer_name": "Sneha Joshi", "customer_tier": "Standard", "shipping_type": "Standard",
      "order_value": 1299.00, "status": "Packing",
      "created_at": "2026-08-16T10:00:00+05:30", "due_at": "2026-08-16T18:00:00+05:30", "current_stage_entered_at": "2026-08-16T13:57:00+05:30",
      "order_items": [ { "id": 101, "sku_id": 13, "quantity_requested": 1, "quantity_allocated": 1, "quantity_picked": 1, "quantity_dispatched": 0, "fulfillment_status": "Allocated" } ]
    },
    {
      "id": 11, "order_code": "ORD-1011", "customer_name": "Vikram Nair", "customer_tier": "VIP", "shipping_type": "Standard",
      "order_value": 2499.00, "status": "Packing",
      "created_at": "2026-08-16T11:00:00+05:30", "due_at": "2026-08-16T16:00:00+05:30", "current_stage_entered_at": "2026-08-16T13:49:00+05:30",
      "order_items": [ { "id": 111, "sku_id": 17, "quantity_requested": 1, "quantity_allocated": 1, "quantity_picked": 1, "quantity_dispatched": 0, "fulfillment_status": "Allocated" } ]
    },
    {
      "id": 12, "order_code": "ORD-1012", "customer_name": "Ishita Bose", "customer_tier": "Standard", "shipping_type": "Standard",
      "order_value": 1798.00, "status": "Packing",
      "created_at": "2026-08-16T08:00:00+05:30", "due_at": "2026-08-17T08:00:00+05:30", "current_stage_entered_at": "2026-08-16T13:42:00+05:30",
      "order_items": [ { "id": 121, "sku_id": 9, "quantity_requested": 2, "quantity_allocated": 2, "quantity_picked": 2, "quantity_dispatched": 0, "fulfillment_status": "Allocated" } ]
    },
    {
      "id": 13, "order_code": "ORD-1013", "customer_name": "Arjun Rao", "customer_tier": "Premium", "shipping_type": "Express",
      "order_value": 3999.00, "status": "Packing",
      "created_at": "2026-08-16T12:00:00+05:30", "due_at": "2026-08-16T15:20:00+05:30", "current_stage_entered_at": "2026-08-16T13:35:00+05:30",
      "order_items": [ { "id": 131, "sku_id": 19, "quantity_requested": 1, "quantity_allocated": 1, "quantity_picked": 1, "quantity_dispatched": 0, "fulfillment_status": "Allocated" } ]
    },
    {
      "id": 14, "order_code": "ORD-1014", "customer_name": "Pooja Desai", "customer_tier": "Standard", "shipping_type": "Standard",
      "order_value": 649.00, "status": "Packing",
      "created_at": "2026-08-16T08:30:00+05:30", "due_at": "2026-08-17T08:30:00+05:30", "current_stage_entered_at": "2026-08-16T13:28:00+05:30",
      "order_items": [ { "id": 141, "sku_id": 11, "quantity_requested": 5, "quantity_allocated": 5, "quantity_picked": 5, "quantity_dispatched": 0, "fulfillment_status": "Allocated" } ]
    },
    {
      "id": 15, "order_code": "ORD-1015", "customer_name": "Manish Gupta", "customer_tier": "Standard", "shipping_type": "Standard",
      "order_value": 1599.00, "status": "Packing",
      "created_at": "2026-08-16T07:00:00+05:30", "due_at": "2026-08-16T19:00:00+05:30", "current_stage_entered_at": "2026-08-16T13:21:00+05:30",
      "order_items": [ { "id": 151, "sku_id": 15, "quantity_requested": 1, "quantity_allocated": 1, "quantity_picked": 1, "quantity_dispatched": 0, "fulfillment_status": "Allocated" } ]
    },
    {
      "id": 16, "order_code": "ORD-1016", "customer_name": "Kavya Krishnan", "customer_tier": "Standard", "shipping_type": "Standard",
      "order_value": 1198.00, "status": "Packing",
      "created_at": "2026-08-16T08:00:00+05:30", "due_at": "2026-08-17T08:00:00+05:30", "current_stage_entered_at": "2026-08-16T13:15:00+05:30",
      "order_items": [ { "id": 161, "sku_id": 16, "quantity_requested": 2, "quantity_allocated": 2, "quantity_picked": 2, "quantity_dispatched": 0, "fulfillment_status": "Allocated" } ]
    },
    {
      "id": 17, "order_code": "ORD-1017", "customer_name": "Suresh Babu", "customer_tier": "Standard", "shipping_type": "Standard",
      "order_value": 899.00, "status": "Packing",
      "created_at": "2026-08-16T06:00:00+05:30", "due_at": "2026-08-16T20:00:00+05:30", "current_stage_entered_at": "2026-08-16T13:02:00+05:30",
      "order_items": [ { "id": 171, "sku_id": 20, "quantity_requested": 1, "quantity_allocated": 1, "quantity_picked": 1, "quantity_dispatched": 0, "fulfillment_status": "Allocated" } ]
    },
    {
      "id": 18, "order_code": "ORD-1018", "customer_name": "Lakshmi Narayan", "customer_tier": "Premium", "shipping_type": "Express",
      "order_value": 1798.00, "status": "Packing",
      "created_at": "2026-08-16T10:00:00+05:30", "due_at": "2026-08-16T14:50:00+05:30", "current_stage_entered_at": "2026-08-16T12:48:00+05:30",
      "order_items": [ { "id": 181, "sku_id": 4, "quantity_requested": 2, "quantity_allocated": 2, "quantity_picked": 2, "quantity_dispatched": 0, "fulfillment_status": "Allocated" } ],
      "_note": "due_at already passed at reference_now — worst-case bottleneck example"
    }
  ],

  "pick_tasks": [
    {
      "id": 1, "order_item_id": 31, "source_location_id": 2,
      "quantity_required": 6, "quantity_confirmed": 4, "sequence": 1, "status": "Exception",
      "assigned_worker": "S. Kumar",
      "assigned_at": "2026-08-16T14:36:00+05:30", "started_at": "2026-08-16T14:40:00+05:30", "completed_at": null,
      "_note": "short-pick on ORD-1003 — 2 units of SKU-110 unaccounted for at A-01-02"
    }
  ],

  "events": [
    {
      "id": 1, "event_type": "damage_reported",
      "order_id": null, "sku_id": 5, "location_id": 3, "quantity": 2,
      "payload": "Water damage found on 2 units of Wireless Earbuds during cycle count at A-02-01.",
      "reported_by": "R. Naidu", "created_at": "2026-08-16T12:00:00+05:30"
    },
    {
      "id": 2, "event_type": "missing_reported",
      "order_id": 3, "sku_id": 10, "location_id": 2, "quantity": 2,
      "payload": "Expected 6 units of Notebook A5 Ruled for ORD-1003 at A-01-02, physically found only 4. Remaining 2 unaccounted for.",
      "reported_by": "S. Kumar", "created_at": "2026-08-16T14:40:00+05:30"
    }
  ]
}