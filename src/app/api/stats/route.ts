import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth, serverError } from '@/lib/auth';
import { getDesignStats } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const stats = await getDesignStats(payload.sub);
    return NextResponse.json({ stats });
  } catch (err) {
    return serverError(err);
  }
}
