import { getDb } from './api/database/init.ts';

try {
  console.log('Testing database initialization...');
  const db = getDb();
  console.log('✅ Database connected successfully');
  
  const users = db.prepare('SELECT * FROM users').all();
  console.log(`✅ Found ${users.length} users`);
  users.forEach(u => console.log(`  - ${u.username} (${u.role}): ${u.real_name}`));
  
  const tickets = db.prepare('SELECT * FROM tickets').all();
  console.log(`✅ Found ${tickets.length} tickets`);
  tickets.forEach(t => console.log(`  - ${t.id}: ${t.title} (${t.status})`));
  
  console.log('\n✅ All tests passed!');
} catch (e) {
  console.error('❌ Test failed:', e.message);
  console.error(e.stack);
  process.exit(1);
}
