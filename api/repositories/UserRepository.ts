import Database from 'better-sqlite3';
import { User, UserRole } from '../../shared/types.js';

export class UserRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  findByUsername(username: string): (User & { passwordHash: string }) | null {
    const stmt = this.db.prepare(`
      SELECT id, username, name, real_name, email, role, permissions, password_hash, created_at
      FROM users WHERE username = ?
    `);
    const row = stmt.get(username) as any;
    return row ? this.mapRowWithPassword(row) : null;
  }

  findById(id: string): User | null {
    const stmt = this.db.prepare(`
      SELECT id, username, name, real_name, email, role, permissions, created_at
      FROM users WHERE id = ?
    `);
    const row = stmt.get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findAll(): User[] {
    const stmt = this.db.prepare(`
      SELECT id, username, name, real_name, email, role, permissions, created_at
      FROM users ORDER BY created_at
    `);
    const rows = stmt.all() as any[];
    return rows.map(this.mapRow);
  }

  findByRole(role: UserRole): User[] {
    const stmt = this.db.prepare(`
      SELECT id, username, name, real_name, email, role, permissions, created_at
      FROM users WHERE role = ? ORDER BY created_at
    `);
    const rows = stmt.all(role) as any[];
    return rows.map(this.mapRow);
  }

  private sqliteToIso = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    return dateStr.replace(' ', 'T') + 'Z';
  };

  private mapRow = (row: any): User => {
    return {
      id: row.id,
      username: row.username,
      name: row.name,
      realName: row.real_name,
      email: row.email,
      role: row.role as UserRole,
      permissions: JSON.parse(row.permissions),
      createdAt: this.sqliteToIso(row.created_at),
    };
  };

  private mapRowWithPassword(row: any): User & { passwordHash: string } {
    return {
      ...this.mapRow(row),
      passwordHash: row.password_hash,
    };
  }
}
