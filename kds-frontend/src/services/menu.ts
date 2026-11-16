import { apiClient } from './api';
import { isDemoModeActive, demoMenuService } from './demoMode';
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
    if (isDemoModeActive()) {
      return demoMenuService.getMenuItems();
    }
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
    if (isDemoModeActive()) {
      return demoMenuService.updateAvailability(payload);
    }
    return apiClient.post<MenuItemStatus>('/api/menu/availability', payload);
  },
};
