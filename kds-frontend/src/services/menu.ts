import { apiClient } from './api';
import type {
  MenuItemCatalog,
  MenuItemStatus,
  UpdateAvailabilityPayload,
} from '../types';

export const menuApi = {
  /**
   * Fetch all 174 catalog menu items with live stock availability status.
   */
  async getMenuItems(): Promise<MenuItemCatalog[]> {
    return apiClient.get<MenuItemCatalog[]>('/api/menu/items');
  },

  /**
   * Fetch custom menu item availability overrides from the database.
   */
  async getAvailability(): Promise<MenuItemStatus[]> {
    return apiClient.get<MenuItemStatus[]>('/api/menu/availability');
  },

  /**
   * Update availability (86 / enable) for a specific dish.
   */
  async updateAvailability(payload: UpdateAvailabilityPayload): Promise<MenuItemStatus> {
    return apiClient.post<MenuItemStatus>('/api/menu/availability', payload);
  },
};
