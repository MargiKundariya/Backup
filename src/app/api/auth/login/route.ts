import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { verifyPassword, signToken, setAuthCookie, badRequest, serverError, unauthorized } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return badRequest('Email and password are required');
    }

    const userWithHash = await getUserByEmail(email);
    if (!userWithHash) {
      return unauthorized('Invalid email or password');
    }

    const isValid = await verifyPassword(password, userWithHash.password_hash);
    if (!isValid) {
      return unauthorized('Invalid email or password');
    }

    // Sign token (expired: false as default)
    const token = await signToken(userWithHash.id, userWithHash.role, false);
    
    const response = NextResponse.json({
      user: {
        id: userWithHash.id,
        email: userWithHash.email,
        role: userWithHash.role,
        full_name: userWithHash.full_name,
        avatar_url: userWithHash.avatar_url,
      }
    });

    return setAuthCookie(response, token);
  } catch (err) {
    return serverError(err);
  }
}
