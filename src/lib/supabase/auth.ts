import { supabase, isSupabaseConfigured } from './client';

let cachedUserId: string | null = null;

const AUTH_TIMEOUT_MS = 8000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('网络连接超时，请检查网络后刷新页面')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

export async function getOrCreateUser(): Promise<string> {
  if (!isSupabaseConfigured()) return 'anon-' + Math.random().toString(36).slice(2);
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) {
    cachedUserId = session.user.id;
    return session.user.id;
  }
  const { data, error } = await withTimeout(
    supabase.auth.signInAnonymously(),
    AUTH_TIMEOUT_MS,
  );
  if (error) throw error;
  if (!data.user?.id) throw new Error('匿名登录失败');
  cachedUserId = data.user.id;
  return data.user.id;
}

export function getUserIdSync(): string | null {
  if (cachedUserId) return cachedUserId;
  return null;
}

export function getUserId(): string | null {
  return cachedUserId;
}

export async function signOut(): Promise<void> {
  cachedUserId = null;
  await supabase.auth.signOut();
}
