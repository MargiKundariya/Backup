import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, serverError } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const supabase = getServiceClient();
    const { data: deviceSets, error } = await supabase
      .from('device_sets')
      .select('*')
      .eq('user_id', payload.sub);

    if (error) throw error;
    return NextResponse.json({ deviceSets });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const body = await req.json();
    const supabase = getServiceClient();
    
    const { data, error } = await supabase
      .from('device_sets')
      .insert({ ...body, user_id: payload.sub })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ deviceSet: data });
  } catch (err) {
    return serverError(err);
  }
}
