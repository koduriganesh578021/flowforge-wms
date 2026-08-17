import { apiClient } from './client';
import type { Order, OrderDetail, PriorityResponse, AllocationResponse, OrderStatus } from '../types';

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

  // POST /orders/{order_id}/transition
  transitionOrder: async (orderId: number, newStatus: OrderStatus, actor?: string): Promise<OrderDetail> => {
    const response = await apiClient.post<OrderDetail>(`/orders/${orderId}/transition`, {
      new_status: newStatus,
      actor
    });
    return response.data;
  },

  // Convenience transition methods
  startPicking: async (orderId: number): Promise<OrderDetail> => {
    return ordersApi.transitionOrder(orderId, 'Picking');
  },

  confirmPicked: async (orderId: number): Promise<OrderDetail> => {
    return ordersApi.transitionOrder(orderId, 'Picked');
  },

  confirmPacked: async (orderId: number): Promise<OrderDetail> => {
    return ordersApi.transitionOrder(orderId, 'Packing');
  },

  sendToQC: async (orderId: number): Promise<OrderDetail> => {
    return ordersApi.transitionOrder(orderId, 'Quality Check');
  },

  qcPass: async (orderId: number): Promise<OrderDetail> => {
    return ordersApi.transitionOrder(orderId, 'Ready to Dispatch');
  },

  qcFail: async (orderId: number): Promise<OrderDetail> => {
    return ordersApi.transitionOrder(orderId, 'Rework Required');
  },

  dispatchOrder: async (orderId: number): Promise<OrderDetail> => {
    return ordersApi.transitionOrder(orderId, 'Dispatched');
  },
};
