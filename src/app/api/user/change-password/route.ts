import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, hashPassword, serverError, badRequest } from '@/lib/auth';
import { resetUserPassword } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const userId = payload.sub;

    const { newPassword } = await req.json();

    if (!newPassword || newPassword.length < 6) {
      return badRequest('Password must be at least 6 characters');
    }

    const passwordHash = await hashPassword(newPassword);
    await resetUserPassword(userId, passwordHash);

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    return serverError(err);
  }
}
