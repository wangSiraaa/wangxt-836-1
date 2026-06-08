import Database from 'better-sqlite3';
import { PauseReason } from '../../shared/types.js';

export class PauseReasonRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  findByTicketId(ticketId: string): PauseReason[] {
    const stmt = this.db.prepare(`
      SELECT id, ticket_id, reason, paused_by, paused_at, resumed_at
      FROM pause_reasons
      WHERE ticket_id = ?
      ORDER BY paused_at DESC
    `);
    const rows = stmt.all(ticketId) as any[];
    return rows.map(this.mapRow);
  }

  create(ticketId: string, reason: string, pausedBy: string): PauseReason {
    const id = 'pr' + Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO pause_reasons (id, ticket_id, reason, paused_by)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, ticketId, reason, pausedBy);
    return this.findById(id)!;
  }

  findById(id: string): PauseReason | null {
    const stmt = this.db.prepare(`
      SELECT id, ticket_id, reason, paused_by, paused_at, resumed_at
      FROM pause_reasons WHERE id = ?
    `);
    const row = stmt.get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  resume(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE pause_reasons
      SET resumed_at = datetime('now')
      WHERE id = ? AND resumed_at IS NULL
    `);
    stmt.run(id);
  }

  findActiveByTicketId(ticketId: string): PauseReason | null {
    const stmt = this.db.prepare(`
      SELECT id, ticket_id, reason, paused_by, paused_at, resumed_at
      FROM pause_reasons
      WHERE ticket_id = ? AND resumed_at IS NULL
      ORDER BY paused_at DESC
      LIMIT 1
    `);
    const row = stmt.get(ticketId) as any;
    return row ? this.mapRow(row) : null;
  }

  private sqliteToIso = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    return dateStr.replace(' ', 'T') + 'Z';
  };

  private mapRow = (row: any): PauseReason => {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      reason: row.reason,
      pausedBy: row.paused_by,
      pausedAt: this.sqliteToIso(row.paused_at),
      resumedAt: this.sqliteToIso(row.resumed_at),
    };
  };
}
