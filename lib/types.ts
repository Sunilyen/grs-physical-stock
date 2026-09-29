export interface Item {
  id: string;
  item_code: string;
  item_name: string;
  mou: string;
  category: "F&B" | "Retail" | "Merchandise";
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Counter {
  id: string;
  counter_code: string;
  counter_name: string;
  counter_type: "F&B" | "Retail" | "Merchandise" | "Mixed";
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CounterItem {
  id: string;
  counter_id: string;
  item_id: string;
  active: boolean;
  created_at: string;
  item?: Item;
}

export interface StockCountSession {
  id: string;
  business_date: string;
  counter_id: string;
  submitted_by: string | null;
  started_at: string;
  submitted_at: string | null;
  status: "draft" | "submitted";
  created_at: string;
  counter?: Counter;
  counts?: PhysicalStockCount[];
  item_count?: number;
}

export interface PhysicalStockCount {
  id: string;
  session_id: string;
  item_id: string;
  counted_qty: number;
  entered_at: string;
  item?: Item;
}

export interface SessionWithDetails extends StockCountSession {
  counter?: Counter;
  counts: (PhysicalStockCount & { item?: Item })[];
}
