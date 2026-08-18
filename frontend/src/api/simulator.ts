import { apiClient } from './client';

export interface DamageStockRequest {
  sku_id: number;
  location_id: number;
  quantity: number;
}

export interface UpdateCountRequest {
  sku_id: number;
  location_id: number;
  new_quantity: number;
}

export interface FailQcRequest {
  order_id: number;
  sku_id: number;
}

export interface SimulatorResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export const simulatorApi = {
  // These paths match the FastAPI router prefix: /api/simulator.
  async damageStock(request: DamageStockRequest): Promise<SimulatorResponse> {
    const response = await apiClient.post<SimulatorResponse>('/api/simulator/damage-stock', request);
    return response.data;
  },

  async updateCount(request: UpdateCountRequest): Promise<SimulatorResponse> {
    const response = await apiClient.post<SimulatorResponse>('/api/simulator/update-count', request);
    return response.data;
  },

  async failQc(request: FailQcRequest): Promise<SimulatorResponse> {
    const response = await apiClient.post<SimulatorResponse>('/api/simulator/fail-qc', request);
    return response.data;
  },
};
