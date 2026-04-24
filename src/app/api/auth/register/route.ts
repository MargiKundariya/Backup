import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/db';
import { hashPassword, signToken, setAuthCookie, badRequest, serverError } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name } = await req.json();

    if (!email || !password) {
      return badRequest('Email and password are required');
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return badRequest('User already exists');
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser(email, passwordHash, 'user', full_name);

    const token = await signToken(user.id, user.role, false);
    const response = NextResponse.json({ user });

    return setAuthCookie(response, token);
  } catch (err) {
    return serverError(err);
  }
}
