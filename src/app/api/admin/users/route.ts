import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, serverError } from '@/lib/auth';
import { query } from '@/lib/postgres';
import { 
  User, createUser, updateUser, deleteUser, 
  createLicense, generateLicenseKey 
} from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    
    // Select all profile fields and calculate expiry status
    // The expiry is inclusive: if expires_at is today, it is NOT yet expired.
    // It expires on the following day.
    const users = await query<User & { expired: boolean }>(`
      SELECT 
        u.id, u.email, u.role, u.full_name, u.avatar_url, u.company_name, 
        u.phone_number, u.address, u.logo_url, u.created_at, u.updated_at,
        CASE 
          WHEN u.role = 'super_admin' THEN FALSE
          WHEN l.expires_at IS NULL THEN (u.created_at + INTERVAL '1 year')::date < NOW()::date
          ELSE l.expires_at::date < NOW()::date
        END as expired
      FROM public.users u
      LEFT JOIN public.licenses l ON u.id = l.owner_user_id
      ORDER BY u.created_at DESC
    `);
    
    return NextResponse.json({ users });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { action, id, email, password, full_name, company_name, phone_number, address, logo } = body;

    if (action === 'create') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      const passwordHash = await hashPassword(password);
      const user = await createUser(
        email, 
        passwordHash, 
        'user', 
        full_name, 
        company_name, 
        phone_number, 
        address
      );

      // Create a 365-day license for the new user
      const licenseKey = generateLicenseKey();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const license = await createLicense({
        key: licenseKey,
        tier: 'individual',
        max_seats: 1,
        owner_user_id: user.id,
        expires_at: expiresAt.toISOString()
      });

      return NextResponse.json({ user, license });
    }

    if (action === 'update') {
      if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      
      const updatedUser = await updateUser(id, {
        full_name,
        company_name,
        phone_number,
        address,
        logo_url: logo
      });

      return NextResponse.json({ user: updatedUser });
    }

    if (action === 'delete') {
      if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      await deleteUser(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return serverError(err);
  }
}
