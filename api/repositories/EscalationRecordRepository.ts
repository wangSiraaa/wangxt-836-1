import Database from 'better-sqlite3';
import { EscalationRecord } from '../../shared/types.js';

export class EscalationRecordRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  findByTicketId(ticketId: string): EscalationRecord[] {
    const stmt = this.db.prepare(`
      SELECT id, ticket_id, escalated_at, escalated_by, reason, level, auto_escalated
      FROM escalation_records
      WHERE ticket_id = ?
      ORDER BY escalated_at DESC
    `);
    const rows = stmt.all(ticketId) as any[];
    return rows.map(this.mapRow);
  }

  create(
    ticketId: string,
    reason: string,
    level: number,
    autoEscalated: boolean,
    escalatedBy?: string
  ): EscalationRecord {
    const id = 'er' + Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO escalation_records (id, ticket_id, reason, level, auto_escalated, escalated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, ticketId, reason, level, autoEscalated ? 1 : 0, escalatedBy || null);
    return this.findById(id)!;
  }

  findById(id: string): EscalationRecord | null {
    const stmt = this.db.prepare(`
      SELECT id, ticket_id, escalated_at, escalated_by, reason, level, auto_escalated
      FROM escalation_records WHERE id = ?
    `);
    const row = stmt.get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  private sqliteToIso = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    return dateStr.replace(' ', 'T') + 'Z';
  };

  private mapRow = (row: any): EscalationRecord => {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      escalatedAt: this.sqliteToIso(row.escalated_at),
      escalatedBy: row.escalated_by,
      reason: row.reason,
      level: row.level,
      escalationLevel: row.level,
      autoEscalated: row.auto_escalated === 1 || row.auto_escalated === true,
      isAutoEscalation: row.auto_escalated === 1 || row.auto_escalated === true,
    };
  };
}
