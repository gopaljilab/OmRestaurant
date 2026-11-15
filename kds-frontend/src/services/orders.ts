import { apiClient } from './api';
import type {
  Order,
  OrderStatus,
  OrderItemStatus,
  CreateOrderPayload,
  KitchenOrderTicket,
} from '../types';

export const ordersApi = {
  /**
   * Fetch all orders, optionally filtered by status.
   * e.g. status = 'incoming' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
   */
  async getOrders(status?: string): Promise<Order[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiClient.get<Order[]>(`/api/orders${query}`);
  },

  /**
   * Fetch a single order by ID with all line items.
   */
  async getOrderById(id: number): Promise<Order> {
    return apiClient.get<Order>(`/api/orders/${id}`);
  },

  /**
   * Create a new order with items.
   */
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    return apiClient.post<Order>('/api/orders', payload);
  },

  /**
   * Transition an order to a new status (e.g. preparing, ready, served, completed, cancelled).
   */
  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
    return apiClient.patch<Order>(`/api/orders/${id}/status`, { status });
  },

  /**
   * Update the cooking status of an individual item in an order.
   * itemStatus: 'pending' | 'cooking' | 'done'
   */
  async updateOrderItemStatus(
    orderId: number,
    itemId: number,
    itemStatus: OrderItemStatus
  ): Promise<Order> {
    return apiClient.patch<Order>(`/api/orders/${orderId}/items/${itemId}`, {
      item_status: itemStatus,
    });
  },

  /**
   * Retrieve the generated Kitchen Order Ticket (KOT) for an order,
   * including station groupings and ASCII thermal ticket.
   */
  async getKOT(id: number): Promise<KitchenOrderTicket> {
    return apiClient.get<KitchenOrderTicket>(`/api/orders/${id}/kot`);
  },
};
