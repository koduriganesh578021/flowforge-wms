import { apiClient } from './client';
import type { InventoryItem } from '../types';

export const inventoryApi = {
  async getInventory(): Promise<InventoryItem[]> {
    const response = await apiClient.get<{ items: InventoryItem[] }>('/inventory');
    return response.data.items;
  },
};
