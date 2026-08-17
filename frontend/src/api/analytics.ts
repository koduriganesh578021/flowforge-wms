import { apiClient } from './client';
import type { DashboardSummary, Bottleneck } from '../types';

export const analyticsApi = {
  // GET /dashboard
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<DashboardSummary>('/dashboard');
    return response.data;
  },

  // GET /analytics/bottlenecks
  getBottlenecks: async (): Promise<Bottleneck[]> => {
    const response = await apiClient.get<Bottleneck[]>('/analytics/bottlenecks');
    return response.data;
  },
};