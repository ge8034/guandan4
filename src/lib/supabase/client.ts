import { createClient } from '@supabase/supabase-js';

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Supabase URL and Anon Key are required');
    }
    _client = createClient(url, key, {
      auth: { autoRefreshToken: true, persistSession: true },
    });
  }
  return _client;
}

// 延迟初始化：只在浏览器端或 env vars 就绪时创建
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    return (getClient() as any)[prop];
  },
});
