import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/app.db');

export function createDatabase(): Database.Database {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function initializeDatabase(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      real_name TEXT,
      email TEXT,
      role TEXT NOT NULL CHECK (role IN ('agent', 'supervisor', 'arbitrator', 'admin')),
      permissions TEXT NOT NULL DEFAULT '[]',
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'processing', 'paused', 'escalated', 'arbitrated', 'closed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sla_deadline DATETIME NOT NULL,
      sla_paused_at DATETIME,
      sla_remaining_ms INTEGER NOT NULL DEFAULT 0,
      sla_duration_minutes INTEGER NOT NULL DEFAULT 1440,
      escalation_level INTEGER DEFAULT 0,
      current_handler_id TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS pause_reasons (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      paused_by TEXT NOT NULL REFERENCES users(id),
      paused_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resumed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS escalation_records (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      escalated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      escalated_by TEXT REFERENCES users(id),
      reason TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1 CHECK (level IN (1, 2)),
      auto_escalated BOOLEAN NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS arbitration_results (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
      arbitrated_by TEXT NOT NULL REFERENCES users(id),
      arbitrated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject', 'adjust')),
      comment TEXT NOT NULL,
      sla_adjustment_minutes INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sla_config (
      id TEXT PRIMARY KEY,
      ticket_type TEXT NOT NULL DEFAULT 'normal',
      duration_minutes INTEGER NOT NULL DEFAULT 1440,
      escalation_threshold_percent INTEGER NOT NULL DEFAULT 80,
      auto_escalate BOOLEAN NOT NULL DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_sla_deadline ON tickets(sla_deadline);
    CREATE INDEX IF NOT EXISTS idx_pause_reasons_ticket_id ON pause_reasons(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_escalation_records_ticket_id ON escalation_records(ticket_id);
  `);
}

export function seedInitialData(db: Database.Database): void {
  const passwordHash = bcrypt.hashSync('123456', 10);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, username, name, real_name, email, role, permissions, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    'u1',
    'agent1',
    '张客服',
    '张客服',
    'zhangkefu@example.com',
    'agent',
    JSON.stringify(['ticket:view', 'ticket:create', 'ticket:pause', 'ticket:process', 'ticket:close']),
    passwordHash
  );
  insertUser.run(
    'u2',
    'supervisor1',
    '李主管',
    '李主管',
    'lisupervisor@example.com',
    'supervisor',
    JSON.stringify(['ticket:view', 'ticket:create', 'ticket:pause', 'ticket:process', 'ticket:escalate', 'ticket:close']),
    passwordHash
  );
  insertUser.run(
    'u3',
    'arbitrator1',
    '王仲裁',
    '王仲裁',
    'wangarbitrator@example.com',
    'arbitrator',
    JSON.stringify(['ticket:view', 'ticket:arbitrate', 'ticket:escalate']),
    passwordHash
  );
  insertUser.run(
    'u4',
    'admin1',
    '赵管理员',
    '赵管理员',
    'zhaoadmin@example.com',
    'admin',
    JSON.stringify(['*']),
    passwordHash
  );

  const insertSlaConfig = db.prepare(`
    INSERT OR IGNORE INTO sla_config (id, ticket_type, duration_minutes, escalation_threshold_percent, auto_escalate)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertSlaConfig.run('sla1', 'normal', 1440, 80, 1);

  const insertTicket = db.prepare(`
    INSERT OR IGNORE INTO tickets (id, title, description, customer_name, customer_email, status, sla_deadline, sla_remaining_ms, sla_duration_minutes, escalation_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);

  const now = new Date();
  const t1Deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const t2Deadline = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const t3Deadline = new Date(now.getTime() - 1 * 60 * 60 * 1000);

  function formatSqliteDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  }

  insertTicket.run(
    't1',
    '无法登录系统',
    '用户反馈无法正常登录企业邮箱系统',
    '张三',
    'zhangsan@example.com',
    'processing',
    formatSqliteDate(t1Deadline),
    24 * 60 * 60 * 1000,
    1440
  );
  insertTicket.run(
    't2',
    '打印机故障',
    '三楼打印机无法正常打印，出现卡纸现象',
    '李四',
    'lisi@example.com',
    'open',
    formatSqliteDate(t2Deadline),
    2 * 60 * 60 * 1000,
    120
  );
  insertTicket.run(
    't3',
    '网络连接异常',
    '办公区网络时断时续，影响正常办公',
    '王五',
    'wangwu@example.com',
    'open',
    formatSqliteDate(t3Deadline),
    0,
    1440
  );

  console.log('Database initialized with seed data');
}

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = createDatabase();
    initializeDatabase(dbInstance);
    seedInitialData(dbInstance);
  }
  return dbInstance;
}
