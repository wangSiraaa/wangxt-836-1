import axios from 'axios';
import type {
  Ticket,
  User,
  PauseReason,
  EscalationRecord,
  ArbitrationResult,
  SlaConfig,
  LoginRequest,
  LoginResponse,
  PauseTicketRequest,
  ArbitrateRequest,
  CreateTicketRequest,
  TicketStatus,
} from '../../shared/types.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data: LoginRequest): Promise<LoginResponse> =>
    api.post('/auth/login', data).then((res) => res.data),
  logout: (): Promise<void> => api.post('/auth/logout').then((res) => res.data),
  getCurrentUser: (): Promise<User> => api.get('/auth/me').then((res) => res.data),
  getUsers: (): Promise<User[]> => api.get('/users').then((res) => res.data),
};

export const ticketAPI = {
  getTickets: (status?: TicketStatus): Promise<Ticket[]> =>
    api
      .get('/tickets', { params: status ? { status } : undefined })
      .then((res) => res.data),
  getTicket: (id: string): Promise<Ticket> =>
    api.get(`/tickets/${id}`).then((res) => res.data),
  createTicket: (data: CreateTicketRequest): Promise<Ticket> =>
    api.post('/tickets', data).then((res) => res.data),
  processTicket: (id: string): Promise<void> =>
    api.post(`/tickets/${id}/process`).then((res) => res.data),
  pauseTicket: (id: string, data: PauseTicketRequest): Promise<void> =>
    api.post(`/tickets/${id}/pause`, data).then((res) => res.data),
  resumeTicket: (id: string): Promise<void> =>
    api.post(`/tickets/${id}/resume`).then((res) => res.data),
  escalateTicket: (id: string, reason: string): Promise<void> =>
    api.post(`/tickets/${id}/escalate`, { reason }).then((res) => res.data),
  arbitrateTicket: (id: string, data: ArbitrateRequest): Promise<void> =>
    api.post(`/tickets/${id}/arbitrate`, data).then((res) => res.data),
  closeTicket: (id: string): Promise<void> =>
    api.post(`/tickets/${id}/close`).then((res) => res.data),
  getPauseReasons: (id: string): Promise<PauseReason[]> =>
    api.get(`/tickets/${id}/pause-reasons`).then((res) => res.data),
  getEscalations: (id: string): Promise<EscalationRecord[]> =>
    api.get(`/tickets/${id}/escalations`).then((res) => res.data),
  getArbitration: (id: string): Promise<ArbitrationResult> =>
    api.get(`/tickets/${id}/arbitration`).then((res) => res.data),
  getEscalatedTickets: (): Promise<Ticket[]> =>
    api.get('/tickets/escalated').then((res) => res.data),
};

export const slaAPI = {
  getConfig: (): Promise<SlaConfig> =>
    api.get('/sla-config').then((res) => res.data),
  updateConfig: (data: {
    durationMinutes: number;
    escalationThresholdPercent: number;
    autoEscalate: boolean;
  }): Promise<void> => api.put('/sla-config', data).then((res) => res.data),
};

export const healthAPI = {
  check: (): Promise<{
    status: string;
    timestamp: string;
    database: string;
    slaWorker: string;
    version: string;
  }> => api.get('/health').then((res) => res.data),
};
