import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, serverError, unauthorized } from '@/lib/auth';
import { getUserById } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const user = await getUserById(payload.sub);
    
    if (!user) {
      return unauthorized('User not found');
    }

    return NextResponse.json({ user });
  } catch (err) {
    return unauthorized();
  }
}
