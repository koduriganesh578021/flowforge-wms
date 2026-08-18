import { apiClient } from './client';
import type { EventPayload, DecisionResponse, ExceptionEvent, ResolveExceptionRequest } from '../types';

export const eventsApi = {
  // POST /events
  submitEvent: async (payload: EventPayload): Promise<DecisionResponse> => {
    const response = await apiClient.post<DecisionResponse>('/events', payload);
    return response.data;
  },

  // GET /exceptions
  getExceptions: async (): Promise<ExceptionEvent[]> => {
    const response = await apiClient.get<ExceptionEvent[]>('/exceptions');
    return response.data;
  },

  // GET /exceptions/{id}
  getExceptionById: async (id: number): Promise<ExceptionEvent> => {
    const response = await apiClient.get<ExceptionEvent>(`/exceptions/${id}`);
    return response.data;
  },

  resolveException: async (id: number, request: ResolveExceptionRequest): Promise<ExceptionEvent> => {
    const response = await apiClient.post<ExceptionEvent>(`/exceptions/${id}/resolve`, request);
    return response.data;
  },
};
