export type OrderStatus =
  | 'incoming'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'completed'
  | 'cancelled';

export type OrderItemStatus = 'pending' | 'cooking' | 'done';

export type OrderType = 'dine_in' | 'takeaway' | 'pre_order';

export type KitchenStation =
  | 'tandoor'
  | 'curry'
  | 'south_indian'
  | 'chinese'
  | 'beverage';

export interface OrderItem {
  id: number;
  order_id: number;
  dish_slug?: string;
  dish_name: string;
  category?: string;
  station: KitchenStation | string;
  unit_price: number;
  quantity: number;
  spice_level?: string;
  item_status: OrderItemStatus;
  notes?: string;
  created_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  order_type: OrderType;
  table_id: number | null;
  table_number: string | null;
  zone: string | null;
  customer_name: string;
  customer_phone?: string | null;
  guest_count: number;
  total_amount: number;
  status: OrderStatus;
  payment_status: string;
  special_notes?: string | null;
  created_at: string;
  accepted_at?: string | null;
  ready_at?: string | null;
  completed_at?: string | null;
  items: OrderItem[];
}

export interface CreateOrderItemPayload {
  dish_slug?: string;
  dish_name: string;
  category?: string;
  station?: string;
  unit_price?: number;
  quantity: number;
  spice_level?: string;
  notes?: string;
}

export interface CreateOrderPayload {
  order_type: OrderType;
  table_id?: number | null;
  customer_name: string;
  customer_phone?: string | null;
  guest_count?: number;
  payment_status?: string;
  special_notes?: string | null;
  items: CreateOrderItemPayload[];
}

export interface StationKOT {
  station: string;
  station_name: string;
  items: OrderItem[];
}

export interface KitchenOrderTicket {
  order_id: number;
  order_number: string;
  order_type: OrderType;
  table_id?: number | null;
  table_number?: string | null;
  zone?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  guest_count: number;
  server_name: string;
  timestamp: string;
  special_notes?: string | null;
  total_items: number;
  stations: StationKOT[];
  formatted_ticket: string;
}
