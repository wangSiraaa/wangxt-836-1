export type TicketStatus = 'open' | 'processing' | 'paused' | 'escalated' | 'arbitrated' | 'closed';

export type UserRole = 'agent' | 'supervisor' | 'arbitrator' | 'admin';

export type ArbitrationDecision = 'approve' | 'reject' | 'adjust';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  customerName: string;
  customerEmail: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string;
  slaPausedAt?: string | null;
  slaRemainingMs: number;
  currentHandlerId?: string | null;
  escalationLevel?: number | null;
  slaDurationMinutes?: number | null;
}

export interface PauseReason {
  id: string;
  ticketId: string;
  reason: string;
  pausedBy: string;
  pausedAt: string;
  resumedAt?: string | null;
}

export interface EscalationRecord {
  id: string;
  ticketId: string;
  escalatedAt: string;
  escalatedBy?: string | null;
  reason: string;
  level: number;
  escalationLevel?: number;
  autoEscalated: boolean;
  isAutoEscalation?: boolean;
}

export interface ArbitrationResult {
  id: string;
  ticketId: string;
  arbitratedBy: string;
  arbitratedAt: string;
  decision: ArbitrationDecision;
  comment: string;
  slaAdjustmentMinutes?: number | null;
  adjustmentMinutes?: number | null;
}

export interface SlaConfig {
  id: string;
  ticketType: string;
  durationMinutes: number;
  escalationThresholdPercent: number;
  autoEscalate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  realName?: string;
  email?: string;
  role: UserRole;
  permissions: string[];
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface PauseTicketRequest {
  reason: string;
  pausedBy: string;
}

export interface ArbitrateRequest {
  decision: ArbitrationDecision;
  comment: string;
  slaAdjustmentMinutes?: number;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  customerName: string;
  customerEmail: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  database: string;
  slaWorker: string;
  version: string;
}

export interface ApiError {
  error: string;
  details?: string;
}

export interface TicketStats {
  total: number;
  open: number;
  processing: number;
  paused: number;
  escalated: number;
  arbitrated: number;
  closed: number;
  overdue: number;
  totalPauseCount: number;
  totalEscalationCount: number;
  avgResolutionMinutes: number;
  slaComplianceRate: number;
}

export interface StatsOverview {
  stats: TicketStats;
  recentTickets: Ticket[];
  escalatedTickets: Ticket[];
  pausedTickets: Ticket[];
  overdueTickets: Ticket[];
}
