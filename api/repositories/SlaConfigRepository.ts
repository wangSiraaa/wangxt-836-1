import Database from 'better-sqlite3';
import { SlaConfig } from '../../shared/types.js';

export class SlaConfigRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  find(): SlaConfig | null {
    const stmt = this.db.prepare(`
      SELECT id, ticket_type, duration_minutes, escalation_threshold_percent, auto_escalate, created_at, updated_at
      FROM sla_config
      LIMIT 1
    `);
    const row = stmt.get() as any;
    return row ? this.mapRow(row) : null;
  }

  update(
    durationMinutes: number,
    escalationThresholdPercent: number,
    autoEscalate: boolean
  ): void {
    const stmt = this.db.prepare(`
      UPDATE sla_config
      SET duration_minutes = ?,
          escalation_threshold_percent = ?,
          auto_escalate = ?,
          updated_at = datetime('now')
      WHERE id = (SELECT id FROM sla_config LIMIT 1)
    `);
    stmt.run(durationMinutes, escalationThresholdPercent, autoEscalate ? 1 : 0);
  }

  private mapRow(row: any): SlaConfig {
    return {
      id: row.id,
      ticketType: row.ticket_type,
      durationMinutes: row.duration_minutes,
      escalationThresholdPercent: row.escalation_threshold_percent,
      autoEscalate: row.auto_escalate === 1 || row.auto_escalate === true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
