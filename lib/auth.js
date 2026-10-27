import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '@/lib/db';

function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET wajib diisi di production');
  }
  return new TextEncoder().encode(s || 'dev-only-secret-change-me-0123456789abcdef');
}

// Set COOKIE_SECURE=false hanya jika app dijalankan lewat HTTP biasa (tanpa HTTPS).
export const cookieSecure = () =>
  process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production';

export async function createSession(userId) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getSecret());
  (await cookies()).set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getUser() {
  const token = (await cookies()).get('session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return (
      (await db.get(
        `SELECT u.id, u.email, u.name, u.role, u.brand_id, u.is_owner, u.access, b.name AS brand_name,
                COALESCE(u.workspace_id, b.workspace_id) AS workspace_id, w.name AS workspace_name
         FROM users u LEFT JOIN brands b ON b.id=u.brand_id
         LEFT JOIN workspaces w ON w.id=COALESCE(u.workspace_id, b.workspace_id)
         WHERE u.id=?`,
        payload.uid
      )) || null
    );
  } catch {
    return null;
  }
}

export async function requireUser() {
  const u = await getUser();
  if (!u) redirect('/login');
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== 'admin') redirect('/dashboard');
  return u;
}

// Akses akun tim brand (admin selalu boleh keduanya).
export const ACCESS = [
  { value: 'all', label: 'Affiliate & KOL' },
  { value: 'affiliate', label: 'Affiliate saja' },
  { value: 'kol', label: 'KOL saja' },
];
export const accessLabel = (v) => ACCESS.find((a) => a.value === v)?.label || ACCESS[0].label;
export const canAffiliate = (user) => user.role === 'admin' || user.access !== 'kol';
export const canKol = (user) => user.role === 'admin' || user.access !== 'affiliate';

// Halaman khusus affiliate (form) / khusus KOL: alihkan akun yang tidak punya akses ke bagian yang boleh.
export async function requireAffiliate() {
  const u = await requireUser();
  if (!canAffiliate(u)) redirect('/dashboard/kol');
  return u;
}
export async function requireKol() {
  const u = await requireUser();
  if (!canKol(u)) redirect('/dashboard');
  return u;
}

export async function requireOwner() {
  const u = await requireUser();
  if (!u.is_owner) redirect('/dashboard');
  return u;
}

// Batas data yang boleh dilihat user, sebagai potongan WHERE untuk tabel brands (alias default "b"):
// admin -> semua brand di workspace-nya; user brand -> brand miliknya saja.
export function brandScope(user, alias = 'b') {
  return user.role === 'admin'
    ? { sql: `${alias}.workspace_id=?`, args: [user.workspace_id] }
    : { sql: `${alias}.id=?`, args: [user.brand_id] };
}

// Brand milik workspace admin / brand milik user brand. Mengembalikan baris brand atau null.
export async function getAccessibleBrand(user, brandId) {
  const s = brandScope(user);
  return db.get(`SELECT * FROM brands b WHERE b.id=? AND ${s.sql}`, Number(brandId), ...s.args);
}

// Brand user hanya boleh akses form milik brand-nya; admin boleh semua form di workspace-nya.
export async function getAccessibleForm(user, formId) {
  if (!canAffiliate(user)) return null;
  const s = brandScope(user);
  return db.get(
    `SELECT f.*, b.workspace_id FROM forms f JOIN brands b ON b.id=f.brand_id
     WHERE f.id=? AND f.deleted_at IS NULL AND ${s.sql}`,
    Number(formId), ...s.args
  );
}

// KOL yang boleh diakses (brand di workspace admin / brand milik user brand). Termasuk nama brand.
export async function getAccessibleKol(user, kolId, { withDeleted = false } = {}) {
  if (!canKol(user)) return null;
  const s = brandScope(user);
  return db.get(
    `SELECT k.*, b.name AS brand_name, b.workspace_id FROM kols k JOIN brands b ON b.id=k.brand_id
     WHERE k.id=? AND ${s.sql} ${withDeleted ? '' : 'AND k.deleted_at IS NULL'}`,
    Number(kolId), ...s.args
  );
}
