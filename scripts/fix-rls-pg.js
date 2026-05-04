const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://postgres.rzzywltxlfgucngfiznx:tQzUrTHi8CahF9bR@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    await pool.query(`drop policy if exists "members_read_room" on public.room_members`);
    console.log('✓ 旧策略已删除');
    await pool.query(`create policy "members_read_all" on public.room_members for select using (true)`);
    console.log('✓ 新策略已创建');
    await pool.end();
    console.log('✓ 完成，刷新页面即可');
  } catch (e) {
    console.error('失败:', e.message);
    process.exit(1);
  }
}

main();
