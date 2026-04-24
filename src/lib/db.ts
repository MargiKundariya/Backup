/**
 * Type-safe PostgreSQL database helpers.
 * All functions use the direct pg pool — no Supabase client.
 */

import { query, queryOne, queryMaybe } from './postgres';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  phone_number: string | null;
  address: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Design {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  device_id: string;
  zone_designs: unknown;
  export_options: unknown;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
}

export type DesignInsert = Omit<Design, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type DesignUpdate = Partial<Omit<Design, 'id' | 'user_id' | 'created_at'>>;

export interface License {
  id: string;
  key: string;
  tier: 'individual' | 'studio' | 'agency';
  max_seats: number;
  status: 'active' | 'suspended' | 'revoked';
  owner_user_id: string | null;
  order_id: string | null;
  notes: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LicenseWithUsage extends License {
  active_seats: number;
  seats_remaining: number;
  owner_name: string | null;
  owner_email: string | null;
}

export interface UserWithLicense extends User {
  license_id: string | null;
  license_key: string | null;
  license_tier: string | null;
  license_expires_at: string | null;
  computed_expiry: string;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUserById(id: string): Promise<User | null> {
  return queryMaybe<User>(
    'SELECT id, email, role, full_name, avatar_url, company_name, phone_number, address, logo_url, created_at, updated_at FROM public.users WHERE id = $1',
    [id]
  );
}

export async function getUserByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
  return queryMaybe<User & { password_hash: string }>(
    'SELECT * FROM public.users WHERE email = $1',
    [email]
  );
}

export async function createUser(
  email: string,
  passwordHash: string,
  role = 'user',
  fullName?: string,
  companyName?: string,
  phoneNumber?: string,
  address?: string,
  logoUrl?: string
): Promise<User> {
  return queryOne<User>(
    `INSERT INTO public.users (email, password_hash, role, full_name, company_name, phone_number, address, logo_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, email, role, full_name, avatar_url, company_name, phone_number, address, logo_url, created_at, updated_at`,
    [email, passwordHash, role, fullName ?? null, companyName ?? null, phoneNumber ?? null, address ?? null, logoUrl ?? null]
  );
}

export async function getAllUsers(): Promise<(User & { expired?: boolean })[]> {
  return query<(User & { expired?: boolean })>(`
    SELECT 
      u.id, u.email, u.role, u.full_name, u.avatar_url, u.company_name, u.phone_number, u.address, u.logo_url, u.created_at, u.updated_at,
      COALESCE(l.expires_at, (u.created_at + INTERVAL '1 year')) < NOW() as expired
    FROM public.users u
    LEFT JOIN public.licenses l ON l.owner_user_id = u.id
    ORDER BY u.created_at DESC
  `);
}

export async function getUsersWithLicenseStatus(): Promise<UserWithLicense[]> {
  return query<UserWithLicense>(`
    SELECT 
      u.id, u.email, u.role, u.full_name, u.avatar_url, u.company_name, u.phone_number, u.address, u.logo_url, u.created_at, u.updated_at,
      l.id as license_id,
      l.key as license_key,
      l.tier as license_tier,
      l.expires_at as license_expires_at,
      COALESCE(l.expires_at, (u.created_at + INTERVAL '1 year')) as computed_expiry
    FROM public.users u
    LEFT JOIN public.licenses l ON l.owner_user_id = u.id
    WHERE u.role = 'user'
    ORDER BY u.created_at DESC
  `);
}

export async function getUserLicenseStatus(userId: string): Promise<{ computed_expiry: string, expired: boolean } | null> {
  const rows = await query<{ computed_expiry: string, expired: boolean }>(`
    SELECT 
      COALESCE(l.expires_at, (u.created_at + INTERVAL '1 year')) as computed_expiry,
      COALESCE(l.expires_at, (u.created_at + INTERVAL '1 year')) < NOW() as expired
    FROM public.users u
    LEFT JOIN public.licenses l ON l.owner_user_id = u.id
    WHERE u.id = $1
  `, [userId]);
  return rows[0] || null;
}

export async function updateUserRole(userId: string, role: string): Promise<User> {
  return queryOne<User>(
    `UPDATE public.users SET role = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, email, role, full_name, avatar_url, company_name, phone_number, address, logo_url, created_at, updated_at`,
    [role, userId]
  );
}

export async function updateUser(
  id: string,
  data: Partial<Omit<User, 'id' | 'email' | 'role' | 'created_at' | 'updated_at'>>
): Promise<User> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.full_name !== undefined) { fields.push(`full_name = $${idx++}`); values.push(data.full_name); }
  if (data.company_name !== undefined) { fields.push(`company_name = $${idx++}`); values.push(data.company_name); }
  if (data.phone_number !== undefined) { fields.push(`phone_number = $${idx++}`); values.push(data.phone_number); }
  if (data.address !== undefined) { fields.push(`address = $${idx++}`); values.push(data.address); }
  if (data.logo_url !== undefined) { fields.push(`logo_url = $${idx++}`); values.push(data.logo_url); }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  return queryOne<User>(
    `UPDATE public.users SET ${fields.join(', ')}
     WHERE id = $${idx}
     RETURNING id, email, role, full_name, avatar_url, company_name, phone_number, address, logo_url, created_at, updated_at`,
    values
  );
}

export async function deleteUser(id: string): Promise<void> {
  await query('DELETE FROM public.users WHERE id = $1', [id]);
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function createSession(userId: string, jti: string, expiresAt: Date): Promise<void> {
  await query(
    'INSERT INTO public.sessions (user_id, token_jti, expires_at) VALUES ($1, $2, $3)',
    [userId, jti, expiresAt]
  );
}

export async function deleteSession(jti: string): Promise<void> {
  await query('DELETE FROM public.sessions WHERE token_jti = $1', [jti]);
}

export async function sessionExists(jti: string): Promise<boolean> {
  const rows = await query(
    'SELECT 1 FROM public.sessions WHERE token_jti = $1 AND expires_at > NOW()',
    [jti]
  );
  return rows.length > 0;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProjects(userId: string): Promise<Project[]> {
  return query<Project>(
    'SELECT * FROM public.projects WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );
}

export async function getProjectById(id: string, userId: string): Promise<Project | null> {
  return queryMaybe<Project>(
    'SELECT * FROM public.projects WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
}

export async function createProject(userId: string, name = 'Untitled Project'): Promise<Project> {
  return queryOne<Project>(
    `INSERT INTO public.projects (user_id, name)
     VALUES ($1, $2)
     RETURNING *`,
    [userId, name]
  );
}

export async function updateProject(id: string, userId: string, name: string): Promise<Project> {
  return queryOne<Project>(
    `UPDATE public.projects SET name = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING *`,
    [name, id, userId]
  );
}

export async function deleteProject(id: string, userId: string): Promise<void> {
  await query(
    'DELETE FROM public.projects WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
}

// ── Designs ───────────────────────────────────────────────────────────────────

export async function getDesigns(projectId: string, userId: string): Promise<Design[]> {
  return query<Design>(
    'SELECT * FROM public.designs WHERE project_id = $1 AND user_id = $2 ORDER BY updated_at DESC',
    [projectId, userId]
  );
}

export async function getUserDesigns(userId: string): Promise<Design[]> {
  return query<Design>(
    'SELECT * FROM public.designs WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );
}

export async function getDesignById(id: string, userId: string): Promise<Design | null> {
  return queryMaybe<Design>(
    'SELECT * FROM public.designs WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
}

export async function createDesign(payload: Omit<DesignInsert, 'user_id'> & { user_id: string }): Promise<Design> {
  return queryOne<Design>(
    `INSERT INTO public.designs (project_id, user_id, name, device_id, zone_designs, export_options, thumbnail)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      payload.project_id,
      payload.user_id,
      payload.name,
      payload.device_id,
      JSON.stringify(payload.zone_designs ?? {}),
      JSON.stringify(payload.export_options ?? {}),
      payload.thumbnail ?? null,
    ]
  );
}

export async function updateDesign(id: string, userId: string, patch: DesignUpdate): Promise<Design> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (patch.name !== undefined) { fields.push(`name = $${idx++}`); values.push(patch.name); }
  if (patch.zone_designs !== undefined) { fields.push(`zone_designs = $${idx++}`); values.push(JSON.stringify(patch.zone_designs)); }
  if (patch.export_options !== undefined) { fields.push(`export_options = $${idx++}`); values.push(JSON.stringify(patch.export_options)); }
  if (patch.thumbnail !== undefined) { fields.push(`thumbnail = $${idx++}`); values.push(patch.thumbnail); }
  if (patch.device_id !== undefined) { fields.push(`device_id = $${idx++}`); values.push(patch.device_id); }

  fields.push(`updated_at = NOW()`);
  values.push(id, userId);

  return queryOne<Design>(
    `UPDATE public.designs SET ${fields.join(', ')}
     WHERE id = $${idx++} AND user_id = $${idx}
     RETURNING *`,
    values
  );
}

export async function deleteDesign(id: string, userId: string): Promise<void> {
  await query(
    'DELETE FROM public.designs WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
}

export async function getDesignStats(userId: string) {
  return query<{ count: number, period: string }>(`
    SELECT count(*)::INTEGER, 'day' as period FROM public.designs WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 day'
    UNION ALL
    SELECT count(*)::INTEGER, 'week' as period FROM public.designs WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 week'
    UNION ALL
    SELECT count(*)::INTEGER, 'month' as period FROM public.designs WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 month'
    UNION ALL
    SELECT count(*)::INTEGER, 'year' as period FROM public.designs WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 year'
  `, [userId]);
}

export async function getGlobalStats() {
  return queryOne<{
    total_users: number;
    total_designs: number;
    total_devices: number;
    pending_approvals: number;
    active_licenses: number;
  }>(`
    SELECT 
      (SELECT count(*) FROM public.users)::INTEGER as total_users,
      (SELECT count(*) FROM public.designs)::INTEGER as total_designs,
      (SELECT count(*) FROM public.devices)::INTEGER as total_devices,
      (SELECT count(*) FROM public.devices WHERE is_approved = FALSE)::INTEGER as pending_approvals,
      (
        SELECT count(*) FROM public.users u
        LEFT JOIN public.licenses l ON l.owner_user_id = u.id
        WHERE COALESCE(l.expires_at, (u.created_at + INTERVAL '1 year')) > NOW()
      )::INTEGER as active_licenses
  `);
}

export async function getGlobalDailyActivity() {
  return query<{ date: string, count: number }>(`
    SELECT date_trunc('day', created_at)::date::text as date, count(*)::INTEGER
    FROM public.designs
    WHERE created_at > NOW() - INTERVAL '14 days'
    GROUP BY 1
    ORDER BY 1 ASC
  `);
}

// ── Credits ───────────────────────────────────────────────────────────────────

export async function getCreditBalance(userId: string): Promise<number> {
  const rows = await query<{ balance: number }>(
    `SELECT COALESCE(SUM(amount), 0)::INTEGER AS balance
     FROM public.credits
     WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
    [userId]
  );
  return rows[0]?.balance ?? 0;
}

// ── User Preferences ──────────────────────────────────────────────────────────

export async function getUserPreferences(userId: string) {
  return queryMaybe(
    'SELECT * FROM public.user_preferences WHERE user_id = $1',
    [userId]
  );
}

export async function upsertUserPreferences(
  userId: string,
  patch: { presets?: unknown[]; recent_devices?: string[] }
) {
  const presets = patch.presets !== undefined ? JSON.stringify(patch.presets) : null;
  const recentDevices = patch.recent_devices;

  await query(
    `INSERT INTO public.user_preferences (user_id, presets, recent_devices)
     VALUES ($1, COALESCE($2::jsonb, '[]'), COALESCE($3, '{}'))
     ON CONFLICT (user_id) DO UPDATE
       SET presets         = COALESCE($2::jsonb, user_preferences.presets),
           recent_devices  = COALESCE($3, user_preferences.recent_devices),
           updated_at      = NOW()`,
    [userId, presets, recentDevices ?? null]
  );
}

// ── Licenses ──────────────────────────────────────────────────────────────────

export async function getAllLicenses(): Promise<LicenseWithUsage[]> {
  return query<LicenseWithUsage>('SELECT * FROM public.license_seat_usage ORDER BY created_at DESC');
}

export async function createLicense(payload: {
  key: string;
  tier: 'individual' | 'studio' | 'agency';
  max_seats: number;
  owner_user_id?: string;
  notes?: string;
  expires_at?: string;
}): Promise<License> {
  return queryOne<License>(
    `INSERT INTO public.licenses (key, tier, max_seats, owner_user_id, notes, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      payload.key,
      payload.tier,
      payload.max_seats,
      payload.owner_user_id ?? null,
      payload.notes ?? null,
      payload.expires_at ?? null
    ]
  );
}

/** Generate a random license key in XXXX-XXXX-XXXX-XXXX format. */
export function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const gen = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${gen(4)}-${gen(4)}-${gen(4)}-${gen(4)}`;
}

export async function updateLicense(
  id: string,
  patch: Partial<Pick<License, 'status' | 'notes' | 'expires_at' | 'max_seats'>>
): Promise<License> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (patch.status !== undefined) { fields.push(`status = $${idx++}`); values.push(patch.status); }
  if (patch.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(patch.notes); }
  if (patch.expires_at !== undefined) { fields.push(`expires_at = $${idx++}`); values.push(patch.expires_at); }
  if (patch.max_seats !== undefined) { fields.push(`max_seats = $${idx++}`); values.push(patch.max_seats); }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  return queryOne<License>(
    `UPDATE public.licenses SET ${fields.join(', ')}
     WHERE id = $${idx}
     RETURNING *`,
    values
  );
}

// ── Devices ───────────────────────────────────────────────────────────────────

export interface DBDevice {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: 'phone' | 'tablet' | 'laptop' | 'watch';
  template_path: string;
  dimensions: { width: number; height: number };
  zones: any[];
  is_custom: boolean;
  owner_user_id: string | null;
  is_approved: boolean;
  created_at: string;
}

export async function getAllDBDevices(userId?: string, isAdmin = false): Promise<DBDevice[]> {
  if (isAdmin) {
    return query<DBDevice>('SELECT * FROM public.devices ORDER BY created_at DESC');
  }

  // Regular users see approved devices OR their own OR system devices
  // Logic: Hide approved/system devices if a private override exists for the same user
  const sql = userId 
    ? `SELECT * FROM public.devices d
       WHERE (
         -- Show global/system devices only if no private override exists for this user
         (is_approved = TRUE OR owner_user_id IS NULL)
         AND NOT EXISTS (
           SELECT 1 FROM public.devices d2 
           WHERE d2.owner_user_id = $1 
           AND d2.brand = d.brand 
           AND d2.model = d.model 
           AND d2.is_approved = FALSE
         )
       )
       OR (
         -- Always show the user's own private devices
         owner_user_id = $1 AND is_approved = FALSE
       )
       ORDER BY created_at DESC`
    : `SELECT * FROM public.devices 
       WHERE is_approved = TRUE 
       OR owner_user_id IS NULL
       ORDER BY created_at DESC`;

  return query<DBDevice>(sql, userId ? [userId] : []);
}

export async function getDBDevice(id: string): Promise<DBDevice | null> {
  return queryMaybe<DBDevice>('SELECT * FROM public.devices WHERE id = $1', [id]);
}

export async function createDBDevice(device: Omit<DBDevice, 'created_at' | 'is_approved'>, isApproved?: boolean): Promise<DBDevice> {
  return queryOne<DBDevice>(
    `INSERT INTO public.devices (id, name, brand, model, category, template_path, dimensions, zones, is_custom, owner_user_id, is_approved)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      device.id,
      device.name,
      device.brand,
      device.model,
      device.category,
      device.template_path,
      device.dimensions,
      JSON.stringify(device.zones),
      device.is_custom !== undefined ? device.is_custom : (device as any).isCustom,
      device.owner_user_id ?? null,
      isApproved !== undefined ? isApproved : (device.owner_user_id === null)
    ]
  );
}

export async function approveDBDevice(id: string, isApproved = true): Promise<DBDevice> {
  return queryOne<DBDevice>(
    `UPDATE public.devices SET is_approved = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [isApproved, id]
  );
}

export async function updateDBDeviceZones(id: string, zones: any[]): Promise<DBDevice> {
  return queryOne<DBDevice>(
    `UPDATE public.devices SET zones = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [JSON.stringify(zones), id]
  );
}

export async function updateDBDevice(id: string, data: Partial<Pick<DBDevice, 'name' | 'brand' | 'model' | 'category' | 'template_path'>>, ownerId?: string): Promise<DBDevice> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
  if (data.brand !== undefined) { fields.push(`brand = $${idx++}`); values.push(data.brand); }
  if (data.model !== undefined) { fields.push(`model = $${idx++}`); values.push(data.model); }
  if (data.category !== undefined) { fields.push(`category = $${idx++}`); values.push(data.category); }
  if (data.template_path !== undefined) { fields.push(`template_path = $${idx++}`); values.push(data.template_path); }

  fields.push(`updated_at = NOW()`);
  const idIdx = idx++;
  values.push(id);
  
  const ownerIdx = idx++;
  values.push(ownerId || null);

  return queryOne<DBDevice>(
    `UPDATE public.devices SET ${fields.join(', ')}
     WHERE id = $${idIdx} AND ($${ownerIdx}::uuid IS NULL OR owner_user_id = $${ownerIdx})
     RETURNING *`,
    values
  );
}

export async function deleteDBDevice(id: string, ownerId?: string): Promise<void> {
  await query(
    `DELETE FROM public.devices 
     WHERE id = $1 AND ($2::uuid IS NULL OR owner_user_id = $2)`, 
    [id, ownerId || null]
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface ExpiringLicenseInfo {
  license_id: string;
  user_id: string;
  user_name: string;
  user_phone: string | null;
  expires_at: string;
}

export async function getLicensesExpiringInRange(startDays: number, endDays: number): Promise<ExpiringLicenseInfo[]> {
  return query<ExpiringLicenseInfo>(
    `SELECT 
      l.id as license_id,
      u.id as user_id,
      u.full_name as user_name,
      u.phone_number as user_phone,
      l.expires_at
    FROM public.licenses l
    JOIN public.users u ON l.owner_user_id = u.id
    WHERE l.status = 'active'
    AND l.expires_at >= CURRENT_DATE + INTERVAL '${startDays} days'
    AND l.expires_at <= CURRENT_DATE + INTERVAL '${endDays} days'
    AND u.phone_number IS NOT NULL`
  );
}
