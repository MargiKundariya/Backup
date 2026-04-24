/**
 * JWT authentication helpers (server-side only).
 * Uses `jose` for JWT sign/verify, `bcryptjs` for password hashing.
 *
 * Env vars required in .env.local:
 *   JWT_SECRET   <strong random string, min 32 chars>
 *   JWT_EXPIRY   3600  (seconds, default 1 hour)
 */

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'change-me-in-production-min-32-chars!!'
);
const JWT_EXPIRY = Number(process.env.JWT_EXPIRY ?? 3600);

export interface JWTPayload {
  sub: string;   // user id
  role: string;  // 'user' | 'super_admin'
  jti: string;
  expired: boolean;
}

// ── Password helpers ──────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

export async function signToken(userId: string, role: string, expired: boolean = false): Promise<string> {
  const jti = crypto.randomUUID();
  return new SignJWT({ role, jti, expired })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRY}s`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      sub:  payload.sub as string,
      role: payload['role'] as string,
      jti:  payload['jti'] as string,
      expired: Boolean(payload['expired']),
    };
  } catch {
    throw new Error('Invalid or expired token');
  }
}

// ── Request middleware ────────────────────────────────────────────────────────

/** Extract and verify the auth token from the request cookie. */
export async function requireAuth(req: NextRequest): Promise<JWTPayload> {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) throw new Error('Not authenticated');
  return verifyToken(token);
}

/** Same as requireAuth but also enforces super_admin role. */
export async function requireAdmin(req: NextRequest): Promise<JWTPayload> {
  const payload = await requireAuth(req);
  if (payload.role !== 'super_admin') throw new Error('Forbidden');
  return payload;
}

// ── Response helpers ──────────────────────────────────────────────────────────

/** Set the auth cookie on a response. */
export function setAuthCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: JWT_EXPIRY,
    path: '/',
  });
  return res;
}

/** Clear the auth cookie. */
export function clearAuthCookie(res: NextResponse): NextResponse {
  res.cookies.delete('auth_token');
  return res;
}

// ── API error helpers ─────────────────────────────────────────────────────────

export function unauthorized(msg = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: msg }, { status: 401 });
}

export function forbidden(msg = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: msg }, { status: 403 });
}

export function badRequest(msg: string): NextResponse {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export function notFound(msg = 'Not found'): NextResponse {
  return NextResponse.json({ error: msg }, { status: 404 });
}

export function serverError(err: unknown): NextResponse {
  console.error('[api error]', err);
  const msg = err instanceof Error ? err.message : 'Internal server error';
  return NextResponse.json({ error: msg }, { status: 500 });
}
