import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, serverError } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    // Stripe implementation would go here
    return NextResponse.json({ url: '#' });
  } catch (err) {
    return serverError(err);
  }
}
