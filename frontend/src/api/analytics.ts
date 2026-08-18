import { useState, useEffect, useCallback } from 'react';
import { apiClient } from './client';
import type { DashboardSummary, Bottleneck, CommandCenterResponse } from '../types';

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

  // GET /dashboard/command-center
  getCommandCenter: async (): Promise<CommandCenterResponse> => {
    const response = await apiClient.get<CommandCenterResponse>('/dashboard/command-center');
    return response.data;
  },
};

export interface UseCommandCenterResult {
  data: CommandCenterResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCommandCenter(): UseCommandCenterResult {
  const [data, setData] = useState<CommandCenterResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await analyticsApi.getCommandCenter();
      setData(result);
    } catch (err) {
      console.error('Error loading command center data:', err);
      setError(err instanceof Error ? err.message : 'Unable to load Command Center data.');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch };
}