import { getDb } from './api/database/init.ts';

const db = getDb();

console.log('当前时间:', new Date().toISOString());
console.log('SQLite now:', db.prepare("SELECT datetime('now') as now").get().now);
console.log('');

const t3 = db.prepare('SELECT * FROM tickets WHERE id = ?').get('t3');
console.log('t3 数据:', JSON.stringify(t3, null, 2));
console.log('');
console.log('sla_deadline:', t3.sla_deadline);
console.log('sla_deadline < now?:', t3.sla_deadline < new Date().toISOString());
console.log('');

const overdue = db.prepare(`
  SELECT id, title, status, sla_deadline, sla_remaining_ms
  FROM tickets
  WHERE status NOT IN ('closed', 'paused')
    AND sla_deadline < datetime('now')
    AND status != 'escalated'
    AND status != 'arbitrated'
`).all();
console.log('超时工单:', JSON.stringify(overdue, null, 2));
