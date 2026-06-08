import { create } from 'zustand';
import { ticketAPI, statsAPI } from '../lib/api.js';
import type {
  Ticket,
  PauseReason,
  EscalationRecord,
  ArbitrationResult,
  TicketStatus,
  PauseTicketRequest,
  ArbitrateRequest,
  CreateTicketRequest,
  StatsOverview,
} from '../../shared/types.js';

interface TicketState {
  tickets: Ticket[];
  escalatedTickets: Ticket[];
  currentTicket: Ticket | null;
  pauseReasons: PauseReason[];
  escalations: EscalationRecord[];
  arbitration: ArbitrationResult | null;
  statsOverview: StatsOverview | null;
  statsLoading: boolean;
  loading: boolean;
  error: string | null;
  fetchTickets: (status?: TicketStatus) => Promise<void>;
  fetchTicket: (id: string) => Promise<void>;
  fetchEscalatedTickets: () => Promise<void>;
  fetchPauseReasons: (id: string) => Promise<void>;
  fetchEscalations: (id: string) => Promise<void>;
  fetchArbitration: (id: string) => Promise<void>;
  fetchStatsOverview: () => Promise<void>;
  createTicket: (data: CreateTicketRequest) => Promise<Ticket>;
  processTicket: (id: string) => Promise<void>;
  pauseTicket: (id: string, data: PauseTicketRequest) => Promise<void>;
  resumeTicket: (id: string) => Promise<void>;
  escalateTicket: (id: string, reason: string) => Promise<void>;
  arbitrateTicket: (id: string, data: ArbitrateRequest) => Promise<void>;
  closeTicket: (id: string) => Promise<void>;
  clearError: () => void;
  clearCurrent: () => void;
  clearStats: () => void;
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  escalatedTickets: [],
  currentTicket: null,
  pauseReasons: [],
  escalations: [],
  arbitration: null,
  statsOverview: null,
  statsLoading: false,
  loading: false,
  error: null,

  fetchTickets: async (status?: TicketStatus) => {
    set({ loading: true, error: null });
    try {
      const tickets = await ticketAPI.getTickets(status);
      set({ tickets, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.error || '获取工单列表失败', loading: false });
    }
  },

  fetchTicket: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const ticket = await ticketAPI.getTicket(id);
      set({ currentTicket: ticket, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.error || '获取工单详情失败', loading: false });
    }
  },

  fetchEscalatedTickets: async () => {
    set({ loading: true, error: null });
    try {
      const tickets = await ticketAPI.getEscalatedTickets();
      set({ escalatedTickets: tickets, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.error || '获取升级工单列表失败', loading: false });
    }
  },

  fetchPauseReasons: async (id: string) => {
    try {
      const reasons = await ticketAPI.getPauseReasons(id);
      set({ pauseReasons: reasons });
    } catch (e: any) {
      set({ error: e.response?.data?.error || '获取暂停记录失败' });
    }
  },

  fetchEscalations: async (id: string) => {
    try {
      const records = await ticketAPI.getEscalations(id);
      set({ escalations: records });
    } catch (e: any) {
      set({ error: e.response?.data?.error || '获取升级记录失败' });
    }
  },

  fetchArbitration: async (id: string) => {
    try {
      const result = await ticketAPI.getArbitration(id);
      set({ arbitration: result });
    } catch (e: any) {
      if (e.response?.status !== 404) {
        set({ error: e.response?.data?.error || '获取仲裁结果失败' });
      }
      set({ arbitration: null });
    }
  },

  createTicket: async (data: CreateTicketRequest) => {
    set({ loading: true, error: null });
    try {
      const ticket = await ticketAPI.createTicket(data);
      set((state) => ({
        tickets: [ticket, ...state.tickets],
        loading: false,
      }));
      return ticket;
    } catch (e: any) {
      const errorMessage = e.response?.data?.error || '创建工单失败';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  processTicket: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await ticketAPI.processTicket(id);
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === id ? { ...t, status: 'processing' as TicketStatus } : t
        ),
        currentTicket:
          state.currentTicket?.id === id
            ? { ...state.currentTicket, status: 'processing' as TicketStatus }
            : state.currentTicket,
        loading: false,
      }));
    } catch (e: any) {
      const errorMessage = e.response?.data?.error || '处理工单失败';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  pauseTicket: async (id: string, data: PauseTicketRequest) => {
    set({ loading: true, error: null });

    if (!data.reason || data.reason.trim() === '') {
      set({ error: '暂停原因不能为空', loading: false });
      throw new Error('暂停原因不能为空');
    }
    if (data.reason.trim().length < 5) {
      set({ error: '暂停原因至少5个字符', loading: false });
      throw new Error('暂停原因至少5个字符');
    }

    try {
      await ticketAPI.pauseTicket(id, data);
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === id ? { ...t, status: 'paused' as TicketStatus } : t
        ),
        currentTicket:
          state.currentTicket?.id === id
            ? { ...state.currentTicket, status: 'paused' as TicketStatus }
            : state.currentTicket,
        loading: false,
      }));
    } catch (e: any) {
      const errorMessage = e.response?.data?.error || '暂停工单失败';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  resumeTicket: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await ticketAPI.resumeTicket(id);
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === id ? { ...t, status: 'processing' as TicketStatus } : t
        ),
        currentTicket:
          state.currentTicket?.id === id
            ? { ...state.currentTicket, status: 'processing' as TicketStatus }
            : state.currentTicket,
        loading: false,
      }));
    } catch (e: any) {
      const errorMessage = e.response?.data?.error || '恢复工单失败';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  escalateTicket: async (id: string, reason: string) => {
    set({ loading: true, error: null });
    try {
      await ticketAPI.escalateTicket(id, reason);
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === id ? { ...t, status: 'escalated' as TicketStatus } : t
        ),
        currentTicket:
          state.currentTicket?.id === id
            ? { ...state.currentTicket, status: 'escalated' as TicketStatus }
            : state.currentTicket,
        loading: false,
      }));
    } catch (e: any) {
      const errorMessage = e.response?.data?.error || '升级工单失败';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  arbitrateTicket: async (id: string, data: ArbitrateRequest) => {
    set({ loading: true, error: null });
    try {
      await ticketAPI.arbitrateTicket(id, data);
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === id ? { ...t, status: 'arbitrated' as TicketStatus } : t
        ),
        currentTicket:
          state.currentTicket?.id === id
            ? { ...state.currentTicket, status: 'arbitrated' as TicketStatus }
            : state.currentTicket,
        loading: false,
      }));
    } catch (e: any) {
      const errorMessage = e.response?.data?.error || '仲裁失败';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  closeTicket: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await ticketAPI.closeTicket(id);
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === id ? { ...t, status: 'closed' as TicketStatus } : t
        ),
        currentTicket:
          state.currentTicket?.id === id
            ? { ...state.currentTicket, status: 'closed' as TicketStatus }
            : state.currentTicket,
        loading: false,
      }));
    } catch (e: any) {
      const errorMessage = e.response?.data?.error || '关闭工单失败';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  clearError: () => set({ error: null }),
  clearCurrent: () =>
    set({
      currentTicket: null,
      pauseReasons: [],
      escalations: [],
      arbitration: null,
    }),

  fetchStatsOverview: async () => {
    set({ statsLoading: true, error: null });
    try {
      const overview = await statsAPI.getOverview();
      set({ statsOverview: overview, statsLoading: false });
    } catch (e: any) {
      const errorMessage = e.response?.data?.error || '获取统计数据失败';
      set({ error: errorMessage, statsLoading: false });
      throw new Error(errorMessage);
    }
  },

  clearStats: () => set({ statsOverview: null }),
}));
