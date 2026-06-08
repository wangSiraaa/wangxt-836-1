import Database from 'better-sqlite3';
import { ArbitrationResult, ArbitrationDecision } from '../../shared/types.js';

export class ArbitrationResultRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  findByTicketId(ticketId: string): ArbitrationResult | null {
    const stmt = this.db.prepare(`
      SELECT id, ticket_id, arbitrated_by, arbitrated_at, decision, comment, sla_adjustment_minutes
      FROM arbitration_results
      WHERE ticket_id = ?
    `);
    const row = stmt.get(ticketId) as any;
    return row ? this.mapRow(row) : null;
  }

  create(
    ticketId: string,
    arbitratedBy: string,
    decision: ArbitrationDecision,
    comment: string,
    slaAdjustmentMinutes?: number
  ): ArbitrationResult {
    const id = 'ar' + Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO arbitration_results (id, ticket_id, arbitrated_by, decision, comment, sla_adjustment_minutes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, ticketId, arbitratedBy, decision, comment, slaAdjustmentMinutes || 0);
    return this.findById(id)!;
  }

  findById(id: string): ArbitrationResult | null {
    const stmt = this.db.prepare(`
      SELECT id, ticket_id, arbitrated_by, arbitrated_at, decision, comment, sla_adjustment_minutes
      FROM arbitration_results WHERE id = ?
    `);
    const row = stmt.get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  private sqliteToIso = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    return dateStr.replace(' ', 'T') + 'Z';
  };

  private mapRow = (row: any): ArbitrationResult => {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      arbitratedBy: row.arbitrated_by,
      arbitratedAt: this.sqliteToIso(row.arbitrated_at),
      decision: row.decision as ArbitrationDecision,
      comment: row.comment,
      slaAdjustmentMinutes: row.sla_adjustment_minutes,
      adjustmentMinutes: row.sla_adjustment_minutes,
    };
  };
}
