import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const ADMIN_PASSWORD = 'gejin';

export async function POST(request: Request) {
  try {
    const { roomId, password } = await request.json();
    if (!roomId || !password) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: '密码错误' }, { status: 403 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );

    const { error } = await supabaseAdmin
      .from('rooms')
      .delete()
      .eq('id', roomId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
