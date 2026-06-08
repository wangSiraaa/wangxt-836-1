import Database from 'better-sqlite3';
import { Ticket, TicketStatus, CreateTicketRequest } from '../../shared/types.js';

export class TicketRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  findAll(status?: TicketStatus): Ticket[] {
    let sql = `
      SELECT id, title, description, customer_name, customer_email, status,
             created_at, updated_at, sla_deadline, sla_paused_at,
             sla_remaining_ms, current_handler_id, sla_duration_minutes, escalation_level
      FROM tickets
    `;
    const params: string[] = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map(this.mapRowToTicket);
  }

  findById(id: string): Ticket | null {
    const stmt = this.db.prepare(`
      SELECT id, title, description, customer_name, customer_email, status,
             created_at, updated_at, sla_deadline, sla_paused_at,
             sla_remaining_ms, current_handler_id, sla_duration_minutes, escalation_level
      FROM tickets WHERE id = ?
    `);
    const row = stmt.get(id) as any;
    return row ? this.mapRowToTicket(row) : null;
  }

  findOverdue(): Ticket[] {
    const stmt = this.db.prepare(`
      SELECT id, title, description, customer_name, customer_email, status,
             created_at, updated_at, sla_deadline, sla_paused_at,
             sla_remaining_ms, current_handler_id, sla_duration_minutes, escalation_level
      FROM tickets
      WHERE status NOT IN ('closed', 'paused')
        AND sla_deadline < datetime('now')
        AND status != 'escalated'
        AND status != 'arbitrated'
    `);
    const rows = stmt.all() as any[];
    return rows.map(this.mapRowToTicket);
  }

  create(req: CreateTicketRequest, slaDeadline: string, slaDurationMs: number): Ticket {
    const id = 't' + Date.now();
    const slaDurationMinutes = Math.floor(slaDurationMs / (60 * 1000));
    const stmt = this.db.prepare(`
      INSERT INTO tickets (id, title, description, customer_name, customer_email, sla_deadline, sla_remaining_ms, sla_duration_minutes, escalation_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);
    stmt.run(id, req.title, req.description, req.customerName, req.customerEmail, slaDeadline, slaDurationMs, slaDurationMinutes);
    return this.findById(id)!;
  }

  updateStatus(id: string, status: TicketStatus, handlerId?: string): void {
    let sql = 'UPDATE tickets SET status = ?, updated_at = datetime(\'now\')';
    const params: any[] = [status];
    if (handlerId) {
      sql += ', current_handler_id = ?';
      params.push(handlerId);
    }
    sql += ' WHERE id = ?';
    params.push(id);
    const stmt = this.db.prepare(sql);
    stmt.run(...params);
  }

  pause(id: string, remainingMs: number): void {
    const stmt = this.db.prepare(`
      UPDATE tickets
      SET status = 'paused', sla_paused_at = datetime('now'),
          sla_remaining_ms = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(remainingMs, id);
  }

  resume(id: string, newDeadline: string): void {
    const stmt = this.db.prepare(`
      UPDATE tickets
      SET status = 'processing', sla_paused_at = NULL,
          sla_deadline = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(newDeadline, id);
  }

  escalate(id: string, level: number = 1): void {
    const stmt = this.db.prepare(`
      UPDATE tickets SET status = 'escalated', escalation_level = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(level, id);
  }

  arbitrate(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE tickets SET status = 'arbitrated', updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(id);
  }

  close(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE tickets SET status = 'closed', updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(id);
  }

  adjustSlaDeadline(id: string, additionalMinutes: number): void {
    const stmt = this.db.prepare(`
      UPDATE tickets
      SET sla_deadline = datetime(sla_deadline, '+' || ? || ' minutes'),
          updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(additionalMinutes, id);
  }

  private sqliteToIso = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    return dateStr.replace(' ', 'T') + 'Z';
  };

  private mapRowToTicket = (row: any): Ticket => {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      status: row.status as TicketStatus,
      createdAt: this.sqliteToIso(row.created_at),
      updatedAt: this.sqliteToIso(row.updated_at),
      slaDeadline: this.sqliteToIso(row.sla_deadline),
      slaPausedAt: this.sqliteToIso(row.sla_paused_at),
      slaRemainingMs: row.sla_remaining_ms,
      currentHandlerId: row.current_handler_id,
      escalationLevel: row.escalation_level,
      slaDurationMinutes: row.sla_duration_minutes,
    };
  };
}
