import { apiClient } from './client';
import type { Order, OrderDetail, PriorityResponse, AllocationResponse } from '../types';

export const ordersApi = {
  // GET /orders
  getOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/orders');
    return response.data;
  },

  // GET /orders/{order_id}
  getOrderById: async (orderId: number): Promise<OrderDetail> => {
    const response = await apiClient.get<OrderDetail>(`/orders/${orderId}`);
    return response.data;
  },

  // POST /orders/{order_id}/prioritize
  prioritizeOrder: async (orderId: number): Promise<PriorityResponse> => {
    const response = await apiClient.post<PriorityResponse>(`/orders/${orderId}/prioritize`);
    return response.data;
  },

  // POST /orders/{order_id}/allocate
  allocateOrder: async (orderId: number): Promise<AllocationResponse> => {
    const response = await apiClient.post<AllocationResponse>(`/orders/${orderId}/allocate`);
    return response.data;
  },
};
