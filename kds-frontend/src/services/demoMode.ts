import type {
  Order,
  OrderStatus,
  OrderItemStatus,
  KitchenOrderTicket,
  MenuItemCatalog,
  MenuItemStatus,
} from '../types';

const DEMO_STORAGE_KEY = 'om_kds_demo_active';
const DEMO_ORDERS_KEY = 'om_kds_demo_orders';
const DEMO_MENU_KEY = 'om_kds_demo_menu';

export function isDemoModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
}

export function setDemoModeActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_STORAGE_KEY, String(active));
  if (active && !localStorage.getItem(DEMO_ORDERS_KEY)) {
    resetDemoData();
  }
}

const nowMs = Date.now();

const INITIAL_DEMO_ORDERS: Order[] = [
  {
    id: 101,
    order_number: 'ORD-101',
    order_type: 'dine_in',
    table_id: 4,
    table_number: '4',
    zone: 'Main Hall',
    customer_name: 'Vikram Malhotra',
    guest_count: 3,
    status: 'preparing',
    payment_status: 'paid',
    total_amount: 890,
    created_at: new Date(nowMs - 19 * 60 * 1000).toISOString(), // 19 mins ago -> DELAYED
    items: [
      {
        id: 1001,
        order_id: 101,
        dish_slug: 'paneer-tikka-shashlik',
        dish_name: 'Tandoori Paneer Tikka',
        category: 'Starters',
        station: 'tandoor',
        quantity: 2,
        unit_price: 280,
        spice_level: 'hot',
        item_status: 'cooking',
        notes: 'Extra crispy, charred edges',
        created_at: new Date(nowMs - 19 * 60 * 1000).toISOString(),
      },
      {
        id: 1002,
        order_id: 101,
        dish_slug: 'dal-makhani-special',
        dish_name: 'Dal Makhani Bukhara',
        category: 'Main Course',
        station: 'curry',
        quantity: 1,
        unit_price: 240,
        spice_level: 'medium',
        item_status: 'cooking',
        notes: 'Slow-simmered, less butter',
        created_at: new Date(nowMs - 19 * 60 * 1000).toISOString(),
      },
      {
        id: 1003,
        order_id: 101,
        dish_slug: 'butter-garlic-naan',
        dish_name: 'Butter Garlic Naan',
        category: 'Breads',
        station: 'tandoor',
        quantity: 3,
        unit_price: 70,
        spice_level: 'mild',
        item_status: 'pending',
        created_at: new Date(nowMs - 19 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 102,
    order_number: 'ORD-102',
    order_type: 'dine_in',
    table_id: 7,
    table_number: '7',
    zone: 'Window Side',
    customer_name: 'Ananya Sharma',
    guest_count: 2,
    status: 'incoming',
    payment_status: 'paid',
    total_amount: 620,
    created_at: new Date(nowMs - 4 * 60 * 1000).toISOString(), // 4 mins ago -> Incoming
    items: [
      {
        id: 1004,
        order_id: 102,
        dish_slug: 'shahi-paneer',
        dish_name: 'Mughlai Shahi Paneer',
        category: 'Main Course',
        station: 'curry',
        quantity: 1,
        unit_price: 260,
        spice_level: 'mild',
        item_status: 'pending',
        notes: 'No onion / No garlic (Jain Prep)',
        created_at: new Date(nowMs - 4 * 60 * 1000).toISOString(),
      },
      {
        id: 1005,
        order_id: 102,
        dish_slug: 'tandoori-roti',
        dish_name: 'Butter Tandoori Roti',
        category: 'Breads',
        station: 'tandoor',
        quantity: 4,
        unit_price: 40,
        spice_level: 'mild',
        item_status: 'pending',
        created_at: new Date(nowMs - 4 * 60 * 1000).toISOString(),
      },
      {
        id: 1006,
        order_id: 102,
        dish_slug: 'masala-chaas',
        dish_name: 'Spiced Masala Chaas',
        category: 'Beverages',
        station: 'beverage',
        quantity: 2,
        unit_price: 80,
        spice_level: 'mild',
        item_status: 'pending',
        created_at: new Date(nowMs - 4 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 103,
    order_number: 'ORD-103',
    order_type: 'takeaway',
    table_id: null,
    table_number: null,
    zone: null,
    customer_name: 'Rahul Verma',
    guest_count: 1,
    status: 'incoming',
    payment_status: 'paid',
    total_amount: 340,
    created_at: new Date(nowMs - 1 * 60 * 1000).toISOString(), // 1 min ago
    items: [
      {
        id: 1007,
        order_id: 103,
        dish_slug: 'mysore-masala-dosa',
        dish_name: 'Mysore Masala Dosa',
        category: 'South Indian',
        station: 'south_indian',
        quantity: 2,
        unit_price: 150,
        spice_level: 'hot',
        item_status: 'pending',
        notes: 'Extra red gun-powder paste',
        created_at: new Date(nowMs - 1 * 60 * 1000).toISOString(),
      },
      {
        id: 1008,
        order_id: 103,
        dish_slug: 'south-filter-coffee',
        dish_name: 'Madras Filter Coffee',
        category: 'Beverages',
        station: 'beverage',
        quantity: 1,
        unit_price: 40,
        spice_level: 'mild',
        item_status: 'pending',
        created_at: new Date(nowMs - 1 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 104,
    order_number: 'ORD-104',
    order_type: 'dine_in',
    table_id: 2,
    table_number: '2',
    zone: 'Patio',
    customer_name: 'Siddharth Roy',
    guest_count: 2,
    status: 'preparing',
    payment_status: 'paid',
    total_amount: 480,
    created_at: new Date(nowMs - 9 * 60 * 1000).toISOString(), // 9 mins ago
    items: [
      {
        id: 1009,
        order_id: 104,
        dish_slug: 'veg-hakka-noodles',
        dish_name: 'Indo-Chinese Hakka Noodles',
        category: 'Chinese',
        station: 'chinese',
        quantity: 2,
        unit_price: 180,
        spice_level: 'medium',
        item_status: 'cooking',
        notes: 'Extra crunchy spring onions',
        created_at: new Date(nowMs - 9 * 60 * 1000).toISOString(),
      },
      {
        id: 1010,
        order_id: 104,
        dish_slug: 'chilli-paneer-dry',
        dish_name: 'Chilli Paneer Dry',
        category: 'Chinese',
        station: 'chinese',
        quantity: 1,
        unit_price: 220,
        spice_level: 'hot',
        item_status: 'cooking',
        created_at: new Date(nowMs - 9 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 105,
    order_number: 'ORD-105',
    order_type: 'dine_in',
    table_id: 9,
    table_number: '9',
    zone: 'Main Hall',
    customer_name: 'Pooja Hegde',
    guest_count: 4,
    status: 'ready',
    payment_status: 'paid',
    total_amount: 550,
    created_at: new Date(nowMs - 13 * 60 * 1000).toISOString(),
    items: [
      {
        id: 1011,
        order_id: 105,
        dish_slug: 'dum-biryani',
        dish_name: 'Hyderabadi Dum Biryani',
        category: 'Rice & Biryani',
        station: 'curry',
        quantity: 1,
        unit_price: 320,
        spice_level: 'medium',
        item_status: 'done',
        created_at: new Date(nowMs - 13 * 60 * 1000).toISOString(),
      },
      {
        id: 1012,
        order_id: 105,
        dish_slug: 'kesar-pista-kulfi',
        dish_name: 'Royal Kesar Pista Kulfi',
        category: 'Beverages & Desserts',
        station: 'beverage',
        quantity: 2,
        unit_price: 110,
        spice_level: 'mild',
        item_status: 'done',
        created_at: new Date(nowMs - 13 * 60 * 1000).toISOString(),
      },
    ],
  },
];

const INITIAL_DEMO_MENU: MenuItemCatalog[] = [
  {
    dish_slug: 'paneer-tikka-shashlik',
    dish_name: 'Tandoori Paneer Tikka',
    category: 'Starters',
    station: 'tandoor',
    unit_price: 280,
    price: 280,
    is_available: true,
  },
  {
    dish_slug: 'malai-chaap-tikka',
    dish_name: 'Creamy Malai Soya Chaap',
    category: 'Starters',
    station: 'tandoor',
    unit_price: 260,
    price: 260,
    is_available: true,
  },
  {
    dish_slug: 'dal-makhani-special',
    dish_name: 'Dal Makhani Bukhara',
    category: 'Main Course',
    station: 'curry',
    unit_price: 240,
    price: 240,
    is_available: true,
  },
  {
    dish_slug: 'shahi-paneer',
    dish_name: 'Mughlai Shahi Paneer',
    category: 'Main Course',
    station: 'curry',
    unit_price: 260,
    price: 260,
    is_available: true,
  },
  {
    dish_slug: 'butter-garlic-naan',
    dish_name: 'Butter Garlic Naan',
    category: 'Breads',
    station: 'tandoor',
    unit_price: 70,
    price: 70,
    is_available: true,
  },
  {
    dish_slug: 'mysore-masala-dosa',
    dish_name: 'Mysore Masala Dosa',
    category: 'South Indian',
    station: 'south_indian',
    unit_price: 150,
    price: 150,
    is_available: true,
  },
  {
    dish_slug: 'idli-vada-combo',
    dish_name: 'Steamed Idli Sambar & Vada',
    category: 'South Indian',
    station: 'south_indian',
    unit_price: 120,
    price: 120,
    is_available: true,
  },
  {
    dish_slug: 'veg-hakka-noodles',
    dish_name: 'Indo-Chinese Hakka Noodles',
    category: 'Chinese',
    station: 'chinese',
    unit_price: 180,
    price: 180,
    is_available: true,
  },
  {
    dish_slug: 'chilli-paneer-dry',
    dish_name: 'Chilli Paneer Dry',
    category: 'Chinese',
    station: 'chinese',
    unit_price: 220,
    price: 220,
    is_available: true,
  },
  {
    dish_slug: 'masala-chaas',
    dish_name: 'Spiced Masala Chaas',
    category: 'Beverages',
    station: 'beverage',
    unit_price: 80,
    price: 80,
    is_available: true,
  },
  {
    dish_slug: 'kesar-pista-kulfi',
    dish_name: 'Royal Kesar Pista Kulfi',
    category: 'Beverages',
    station: 'beverage',
    unit_price: 110,
    price: 110,
    is_available: false, // 86'd item demonstration
  },
];

export function resetDemoData(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(INITIAL_DEMO_ORDERS));
  localStorage.setItem(DEMO_MENU_KEY, JSON.stringify(INITIAL_DEMO_MENU));
}

function loadOrders(): Order[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_ORDERS;
  const raw = localStorage.getItem(DEMO_ORDERS_KEY);
  if (!raw) {
    resetDemoData();
    return INITIAL_DEMO_ORDERS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_ORDERS;
  }
}

function saveOrders(orders: Order[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(orders));
}

function loadMenu(): MenuItemCatalog[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_MENU;
  const raw = localStorage.getItem(DEMO_MENU_KEY);
  if (!raw) {
    resetDemoData();
    return INITIAL_DEMO_MENU;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_MENU;
  }
}

function saveMenu(items: MenuItemCatalog[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_MENU_KEY, JSON.stringify(items));
}

export const demoOrdersService = {
  async getOrders(status?: string): Promise<Order[]> {
    const orders = loadOrders();
    if (!status || status === 'all') return orders;
    return orders.filter((o) => o.status === status);
  },

  async getOrderById(id: number): Promise<Order> {
    const orders = loadOrders();
    const found = orders.find((o) => o.id === id);
    if (!found) throw new Error(`Demo order #${id} not found.`);
    return found;
  },

  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
    const orders = loadOrders();
    const target = orders.find((o) => o.id === id);
    if (!target) throw new Error(`Demo order #${id} not found.`);

    target.status = status;
    if (status === 'completed' || status === 'served') {
      target.completed_at = new Date().toISOString();
      target.items?.forEach((i) => {
        i.item_status = 'done';
      });
    } else if (status === 'preparing') {
      target.items?.forEach((i) => {
        if (i.item_status === 'pending') i.item_status = 'cooking';
      });
    } else if (status === 'ready') {
      target.items?.forEach((i) => {
        i.item_status = 'done';
      });
    }

    saveOrders(orders);
    return target;
  },

  async updateOrderItemStatus(
    orderId: number,
    itemId: number,
    itemStatus: OrderItemStatus
  ): Promise<Order> {
    const orders = loadOrders();
    const target = orders.find((o) => o.id === orderId);
    if (!target) throw new Error(`Demo order #${orderId} not found.`);

    const item = target.items?.find((i) => i.id === itemId);
    if (item) {
      item.item_status = itemStatus;
    }

    // Auto-progress order status if all items are done
    const allDone = target.items?.every((i) => i.item_status === 'done');
    const anyCooking = target.items?.some((i) => i.item_status === 'cooking');

    if (allDone) {
      target.status = 'ready';
    } else if (anyCooking && target.status === 'incoming') {
      target.status = 'preparing';
    }

    saveOrders(orders);
    return target;
  },

  async getKOT(id: number): Promise<KitchenOrderTicket> {
    const order = await this.getOrderById(id);
    const formatted = `
========================================
       OM RESTAURANT - KOT SLIP         
========================================
Ticket : ${order.order_number}
Type   : ${order.order_type.toUpperCase()}
Table  : ${order.table_number || 'COUNTER'}
Server : System Demo / Pass
Time   : ${new Date(order.created_at).toLocaleTimeString()}
----------------------------------------
QTY   ITEM                     STATION  
----------------------------------------
${order.items
  ?.map(
    (i) =>
      `${String(i.quantity).padEnd(5)} ${(i.dish_name || '').slice(0, 22).padEnd(24)} ${(
        i.station || ''
      ).toUpperCase()}`
  )
  .join('\n')}
----------------------------------------
Special Instructions:
${order.items?.map((i) => (i.notes ? `* ${i.notes}` : '')).filter(Boolean).join('\n') || 'None'}
========================================
`;

    return {
      order_id: order.id,
      order_number: order.order_number,
      order_type: order.order_type,
      table_number: order.table_number,
      customer_name: order.customer_name,
      guest_count: order.guest_count,
      server_name: 'Expedite Pass',
      timestamp: new Date().toLocaleTimeString(),
      total_items: order.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 0,
      formatted_ticket: formatted.trim(),
      stations: [
        {
          station: 'tandoor',
          station_name: 'Tandoor & Chaap',
          items: order.items?.filter((i) => i.station === 'tandoor') || [],
        },
        {
          station: 'curry',
          station_name: 'Mughlai Curries',
          items: order.items?.filter((i) => i.station === 'curry') || [],
        },
        {
          station: 'south_indian',
          station_name: 'South Indian & Dosas',
          items: order.items?.filter((i) => i.station === 'south_indian') || [],
        },
        {
          station: 'chinese',
          station_name: 'Indo-Chinese',
          items: order.items?.filter((i) => i.station === 'chinese') || [],
        },
        {
          station: 'beverage',
          station_name: 'Beverages & Desserts',
          items: order.items?.filter((i) => i.station === 'beverage') || [],
        },
      ],
    };
  },
};

export const demoMenuService = {
  async getMenuItems(): Promise<MenuItemCatalog[]> {
    return loadMenu();
  },

  async updateAvailability(payload: { dish_slug: string; is_available: boolean }): Promise<MenuItemStatus> {
    const items = loadMenu();
    const target = items.find((i) => i.dish_slug === payload.dish_slug);
    if (target) {
      target.is_available = payload.is_available;
      saveMenu(items);
    }
    return {
      dish_slug: payload.dish_slug,
      dish_name: target?.dish_name || payload.dish_slug,
      is_available: payload.is_available,
      updated_at: new Date().toISOString(),
    };
  },
};
