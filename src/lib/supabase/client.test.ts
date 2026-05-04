import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
});

describe('Supabase Client', () => {
  it('should create a client instance', async () => {
    const { supabase } = await import('./client');
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });
});
