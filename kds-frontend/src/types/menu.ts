export interface MenuItemStatus {
  dish_slug: string;
  dish_name: string;
  is_available: boolean;
  updated_at: string;
}

export interface MenuItemCatalog {
  dish_slug: string;
  dish_name: string;
  category: string;
  station: string;
  unit_price: number;
  price?: number;
  is_available: boolean;
}

export interface UpdateAvailabilityPayload {
  dish_slug: string;
  dish_name?: string;
  is_available: boolean;
}
