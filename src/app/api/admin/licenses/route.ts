import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, serverError } from '@/lib/auth';
import { query } from '@/lib/postgres';
import { updateLicense } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    
    // Join users with licenses to get full status for LicenseManagement.tsx
    // ONLY display non-super_admin users as requested
    const users = await query(`
      SELECT 
        u.*,
        l.id as license_id,
        l.key as license_key,
        l.tier as license_tier,
        l.expires_at as license_expires_at,
        COALESCE(l.expires_at, (u.created_at + INTERVAL '1 year')) as computed_expiry
      FROM public.users u
      LEFT JOIN public.licenses l ON u.id = l.owner_user_id
      WHERE u.role != 'super_admin'
      ORDER BY u.created_at DESC
    `);

    return NextResponse.json({ users });
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { id, expires_at } = body;

    if (!id || !expires_at) {
      return NextResponse.json({ error: 'License ID and expiration date are required' }, { status: 400 });
    }

    // When extending, we treat the date as the inclusive end of the license.
    // The frontend logic (today > expiryDate) matches this.
    const updated = await updateLicense(id, { expires_at });
    return NextResponse.json({ license: updated });
  } catch (err) {
    return serverError(err);
  }
}
