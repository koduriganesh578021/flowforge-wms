import { isAxiosError } from 'axios';
import { apiClient } from './client';
import type { Order, OrderDetail, PriorityResponse, AllocationResponse, OrderStatus } from '../types';

export class OrdersApiError extends Error {
  public readonly status?: number;

  constructor(
    message: string,
    status?: number,
  ) {
    super(message);
    this.name = 'OrdersApiError';
    this.status = status;
  }
}

type BlockedOrderResponse = {
  blocked?: boolean;
  reasons?: Array<{ message?: unknown }>;
};

function rethrowOrderApiError(error: unknown): never {
  if (isAxiosError<{ detail?: unknown }>(error)) {
    const detail = error.response?.data?.detail;
    const block = error.response?.data as BlockedOrderResponse | undefined;
    const blockMessage = block?.blocked && typeof block.reasons?.[0]?.message === 'string'
      ? block.reasons[0].message
      : undefined;
    const message = typeof detail === 'string' && detail.trim()
      ? detail
      : blockMessage || error.message || 'The order request could not be completed.';
    throw new OrdersApiError(message, error.response?.status);
  }

  throw error;
}

export const ordersApi = {
  // GET /api/orders
  getOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/api/orders');
    return response.data;
  },

  // GET /api/orders/{order_id}
  getOrderById: async (orderId: number): Promise<OrderDetail> => {
    const response = await apiClient.get<OrderDetail>(`/api/orders/${orderId}`);
    return response.data;
  },

  // POST /api/orders/{order_id}/prioritize
  prioritizeOrder: async (orderId: number): Promise<PriorityResponse> => {
    try {
      const response = await apiClient.post<PriorityResponse>(`/api/orders/${orderId}/prioritize`);
      return response.data;
    } catch (error) {
      return rethrowOrderApiError(error);
    }
  },

  // POST /api/orders/{order_id}/allocate
  allocateOrder: async (orderId: number): Promise<AllocationResponse> => {
    try {
      const response = await apiClient.post<AllocationResponse>(`/api/orders/${orderId}/allocate`);
      return response.data;
    } catch (error) {
      return rethrowOrderApiError(error);
    }
  },

  // POST /api/orders/{order_id}/transition
  transitionOrder: async (orderId: number, newStatus: OrderStatus, actor?: string): Promise<OrderDetail> => {
    try {
      const response = await apiClient.post<OrderDetail>(`/api/orders/${orderId}/transition`, { new_status: newStatus, actor });
      return response.data;
    } catch (error) {
      return rethrowOrderApiError(error);
    }
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
