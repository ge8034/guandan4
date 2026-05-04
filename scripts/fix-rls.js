const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '..', '.env.local'), 'utf8');
const lines = Object.fromEntries(
  envContent.split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => {
    const i = l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];
  })
);

const supabase = createClient(
  lines.NEXT_PUBLIC_SUPABASE_URL,
  lines.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const sql = `
    drop policy if exists "members_read_room" on public.room_members;
    create policy "members_read_all" on public.room_members for select using (true);
  `;

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) {
    console.error('失败:', error.message);
    process.exit(1);
  }
  console.log('✓ RLS 策略已修复');
}

main();
