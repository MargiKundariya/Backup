import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, serverError } from '@/lib/auth';
import { getCreditBalance } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const balance = await getCreditBalance(payload.sub);
    return NextResponse.json({ balance });
  } catch (err) {
    return serverError(err);
  }
}
