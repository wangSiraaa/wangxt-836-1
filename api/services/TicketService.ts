import Database from 'better-sqlite3';
import { TicketRepository } from '../repositories/TicketRepository.js';
import { PauseReasonRepository } from '../repositories/PauseReasonRepository.js';
import { EscalationRecordRepository } from '../repositories/EscalationRecordRepository.js';
import { ArbitrationResultRepository } from '../repositories/ArbitrationResultRepository.js';
import { SlaConfigRepository } from '../repositories/SlaConfigRepository.js';
import {
  Ticket,
  TicketStatus,
  CreateTicketRequest,
  PauseTicketRequest,
  ArbitrateRequest,
  ArbitrationDecision,
  EscalationRecord,
  TicketStats,
  StatsOverview,
} from '../../shared/types.js';

function formatSqliteDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

export class TicketService {
  private ticketRepo: TicketRepository;
  private pauseReasonRepo: PauseReasonRepository;
  private escalationRepo: EscalationRecordRepository;
  private arbitrationRepo: ArbitrationResultRepository;
  private slaConfigRepo: SlaConfigRepository;
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.ticketRepo = new TicketRepository(db);
    this.pauseReasonRepo = new PauseReasonRepository(db);
    this.escalationRepo = new EscalationRecordRepository(db);
    this.arbitrationRepo = new ArbitrationResultRepository(db);
    this.slaConfigRepo = new SlaConfigRepository(db);
  }

  getAllTickets(status?: TicketStatus): Ticket[] {
    return this.ticketRepo.findAll(status);
  }

  getTicketById(id: string): Ticket | null {
    return this.ticketRepo.findById(id);
  }

  getEscalatedTickets(): Ticket[] {
    return this.ticketRepo.findAll('escalated');
  }

  createTicket(req: CreateTicketRequest): Ticket {
    const slaConfig = this.slaConfigRepo.find();
    const durationMs = (slaConfig?.durationMinutes || 1440) * 60 * 1000;
    const slaDeadline = formatSqliteDate(new Date(Date.now() + durationMs));
    return this.ticketRepo.create(req, slaDeadline, durationMs);
  }

  processTicket(id: string, handlerId: string): void {
    const ticket = this.ticketRepo.findById(id);
    if (!ticket) {
      throw new Error('工单不存在');
    }
    if (ticket.status === 'closed') {
      throw new Error('工单已关闭，无法处理');
    }
    if (ticket.status === 'paused') {
      throw new Error('工单已暂停，请先恢复');
    }
    this.ticketRepo.updateStatus(id, 'processing', handlerId);
  }

  pauseTicket(id: string, req: PauseTicketRequest): void {
    if (!req.reason || req.reason.trim() === '') {
      throw new Error('暂停原因不能为空');
    }
    if (req.reason.trim().length < 5) {
      throw new Error('暂停原因至少5个字符');
    }

    const ticket = this.ticketRepo.findById(id);
    if (!ticket) {
      throw new Error('工单不存在');
    }
    if (ticket.status === 'closed') {
      throw new Error('工单已关闭，无法暂停');
    }
    if (ticket.status === 'paused') {
      throw new Error('工单已暂停');
    }

    const now = new Date();
    const deadline = new Date(ticket.slaDeadline);
    const remainingMs = Math.max(0, deadline.getTime() - now.getTime());

    const tx = this.db.transaction(() => {
      this.ticketRepo.pause(id, remainingMs);
      this.pauseReasonRepo.create(id, req.reason.trim(), req.pausedBy);
    });

    tx();
  }

  resumeTicket(id: string): void {
    const ticket = this.ticketRepo.findById(id);
    if (!ticket) {
      throw new Error('工单不存在');
    }
    if (ticket.status !== 'paused') {
      throw new Error('工单未暂停，无法恢复');
    }

    const activePause = this.pauseReasonRepo.findActiveByTicketId(id);
    if (!activePause) {
      throw new Error('未找到活跃的暂停记录');
    }

    const newDeadline = formatSqliteDate(new Date(Date.now() + ticket.slaRemainingMs));

    const tx = this.db.transaction(() => {
      this.ticketRepo.resume(id, newDeadline);
      this.pauseReasonRepo.resume(activePause.id);
    });

    tx();
  }

  escalateTicket(id: string, reason: string, escalatedBy?: string): EscalationRecord {
    const ticket = this.ticketRepo.findById(id);
    if (!ticket) {
      throw new Error('工单不存在');
    }
    if (ticket.status === 'closed') {
      throw new Error('工单已关闭，无法升级');
    }
    if (ticket.status === 'escalated' || ticket.status === 'arbitrated') {
      throw new Error('工单已升级');
    }

    const tx = this.db.transaction(() => {
      this.ticketRepo.escalate(id, 2);
      return this.escalationRepo.create(id, reason, 2, false, escalatedBy);
    });

    return tx();
  }

  autoEscalateOverdueTickets(): EscalationRecord[] {
    const slaConfig = this.slaConfigRepo.find();
    if (!slaConfig?.autoEscalate) {
      return [];
    }

    const overdueTickets = this.ticketRepo.findOverdue();
    const records: EscalationRecord[] = [];

    for (const ticket of overdueTickets) {
      try {
        const record = this.db.transaction(() => {
          this.ticketRepo.escalate(ticket.id, 1);
          return this.escalationRepo.create(
            ticket.id,
            'SLA超时自动升级',
            1,
            true
          );
        })();
        records.push(record);
        console.log(`工单 ${ticket.id} 已自动升级: ${ticket.title}`);
      } catch (e) {
        console.error(`自动升级工单 ${ticket.id} 失败:`, e);
      }
    }

    return records;
  }

  arbitrateTicket(id: string, arbitratedBy: string, req: ArbitrateRequest): void {
    if (!req.comment || req.comment.trim() === '') {
      throw new Error('仲裁意见不能为空');
    }

    const ticket = this.ticketRepo.findById(id);
    if (!ticket) {
      throw new Error('工单不存在');
    }
    if (ticket.status !== 'escalated') {
      throw new Error('只有已升级的工单才能仲裁');
    }

    const tx = this.db.transaction(() => {
      this.arbitrationRepo.create(
        id,
        arbitratedBy,
        req.decision,
        req.comment.trim(),
        req.slaAdjustmentMinutes
      );

      if (req.decision === 'adjust' && req.slaAdjustmentMinutes && req.slaAdjustmentMinutes > 0) {
        this.ticketRepo.adjustSlaDeadline(id, req.slaAdjustmentMinutes);
      }

      this.ticketRepo.arbitrate(id);
    });

    tx();
  }

  closeTicket(id: string): void {
    const ticket = this.ticketRepo.findById(id);
    if (!ticket) {
      throw new Error('工单不存在');
    }
    if (ticket.status === 'closed') {
      throw new Error('工单已关闭');
    }
    this.ticketRepo.close(id);
  }

  getPauseReasons(ticketId: string) {
    return this.pauseReasonRepo.findByTicketId(ticketId);
  }

  getEscalationRecords(ticketId: string) {
    return this.escalationRepo.findByTicketId(ticketId);
  }

  getArbitrationResult(ticketId: string) {
    return this.arbitrationRepo.findByTicketId(ticketId);
  }

  getSlaConfig() {
    return this.slaConfigRepo.find();
  }

  updateSlaConfig(
    durationMinutes: number,
    escalationThresholdPercent: number,
    autoEscalate: boolean
  ): void {
    if (durationMinutes <= 0) {
      throw new Error('SLA时长必须大于0');
    }
    if (escalationThresholdPercent < 0 || escalationThresholdPercent > 100) {
      throw new Error('升级阈值必须在0-100之间');
    }
    this.slaConfigRepo.update(durationMinutes, escalationThresholdPercent, autoEscalate);
  }

  getStatsOverview(): StatsOverview {
    const statusCounts = this.ticketRepo.countByStatus();
    const overdueCount = this.ticketRepo.countOverdue();
    const totalPauseCount = this.pauseReasonRepo.countAll();
    const totalEscalationCount = this.escalationRepo.countAll();
    const avgResolutionMinutes = this.ticketRepo.getAvgResolutionMinutes();
    const slaComplianceRate = this.ticketRepo.getSlaComplianceRate();

    const stats: TicketStats = {
      total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
      open: statusCounts['open'] || 0,
      processing: statusCounts['processing'] || 0,
      paused: statusCounts['paused'] || 0,
      escalated: statusCounts['escalated'] || 0,
      arbitrated: statusCounts['arbitrated'] || 0,
      closed: statusCounts['closed'] || 0,
      overdue: overdueCount,
      totalPauseCount,
      totalEscalationCount,
      avgResolutionMinutes,
      slaComplianceRate,
    };

    return {
      stats,
      recentTickets: this.ticketRepo.findRecent(5),
      escalatedTickets: this.getEscalatedTickets(),
      pausedTickets: this.ticketRepo.findPaused(),
      overdueTickets: this.ticketRepo.findOverdueTickets(),
    };
  }
}
