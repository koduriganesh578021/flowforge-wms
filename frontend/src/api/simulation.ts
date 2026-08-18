import { isAxiosError } from 'axios';
import { useCallback, useState } from 'react';
import { apiClient } from './client';
import type { SimulateEventRequest, SimulateEventResponse } from '../types';

export const SIMULATION_DATA_CHANGED_EVENT = 'flowforge:simulation-data-changed';

export const simulationApi = {
  async simulateEvent(
    payload: SimulateEventRequest,
  ): Promise<SimulateEventResponse> {
    const response = await apiClient.post<SimulateEventResponse>(
      '/simulate/event',
      payload,
    );
    return response.data;
  },
};

function getError(error: unknown) {
  if (
    isAxiosError<{ detail?: unknown }>(error) &&
    typeof error.response?.data?.detail === 'string'
  ) {
    return error.response.data.detail;
  }
  return error instanceof Error ? error.message : 'The event could not be simulated.';
}

export function useSimulateEvent() {
  const [isPending, setIsPending] = useState(false);

  const simulateEvent = useCallback(
    async (payload: SimulateEventRequest) => {
      try {
        setIsPending(true);
        const result = await simulationApi.simulateEvent(payload);
        window.dispatchEvent(new CustomEvent(SIMULATION_DATA_CHANGED_EVENT));
        return result;
      } catch (error) {
        const message = getError(error);
        const wrapped = new Error(message);
        (wrapped as Error & { cause?: unknown }).cause = error;
        throw wrapped;
      } finally {
        setIsPending(false);
      }
    },
    [],
  );

  return { simulateEvent, isPending };
}
