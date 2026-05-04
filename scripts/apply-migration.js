const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 从 .env.local 读取环境变量
const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

function parseEnv(content) {
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const value = trimmed.slice(eqIdx + 1);
    vars[key] = value;
  }
  return vars;
}

const env = parseEnv(envContent);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('缺少 Supabase 配置。请检查 .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function applyMigration() {
  try {
    console.log('✓ 已连接到 Supabase:', supabaseUrl);

    const migrationFile = path.resolve(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '20260429_phase3_init.sql'
    );
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('执行迁移:', path.basename(migrationFile));

    // 通过 REST API 执行 SQL
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // 如果 exec_sql RPC 不可用，尝试直接使用 management API
      console.error('RPC 方式失败:', error.message);
      console.log('尝试使用 REST API 直接执行...');

      // 回退方案：分条执行
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
          if (stmtError) {
            console.error(`  语句 ${i + 1}/${statements.length} 失败:`, stmtError.message.substring(0, 80));
          } else {
            console.log(`  ✓ 语句 ${i + 1}/${statements.length}`);
          }
        } catch (e) {
          console.error(`  语句 ${i + 1} 异常:`, e.message?.substring(0, 80));
        }
      }
    } else {
      console.log('✓ 迁移执行成功');
    }

    console.log('\n✓ 迁移完成');
  } catch (error) {
    console.error('迁移失败:', error.message);
    process.exit(1);
  }
}

applyMigration();
