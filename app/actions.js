'use server';

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db, newTrackToken } from '@/lib/db';
import { createSession, requireUser, requireAdmin, getAccessibleForm } from '@/lib/auth';
import { defaultQuestions, sanitizeQuestions, HAS_OPTIONS, MAX_FILE } from '@/lib/questions';
import { sanitizeStyle } from '@/lib/brandStyle';
import { isStatus } from '@/lib/shipping';

const HEX = /^#[0-9a-fA-F]{6}$/;
const MAX_LOGO = 300 * 1024;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_COVER = 1024 * 1024;
const COVER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/* ---------- auth ---------- */

export async function login(_prev, fd) {
  const email = String(fd.get('email') || '').trim().toLowerCase();
  const password = String(fd.get('password') || '');
  const user = await db.get('SELECT * FROM users WHERE email=?', email);
  // password_hash kosong = akun khusus login Google.
  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return { error: 'Email atau password salah.' };
  }
  await createSession(user.id);
  redirect('/dashboard/statistik');
}

export async function logout() {
  (await cookies()).delete('session');
  redirect('/login');
}

/* ---------- brands & users (admin) ---------- */

async function readImage(file, { what, max, maxLabel, types = LOGO_TYPES, typesLabel = 'PNG, JPG, WEBP, atau SVG' }) {
  if (!file || typeof file === 'string' || file.size === 0) return { ok: true, value: null };
  if (!types.includes(file.type)) return { ok: false, error: `${what} harus ${typesLabel}.` };
  if (file.size > max) return { ok: false, error: `Ukuran ${what.toLowerCase()} maksimal ${maxLabel}.` };
  const buf = Buffer.from(await file.arrayBuffer());
  return { ok: true, value: `data:${file.type};base64,${buf.toString('base64')}` };
}

const readLogo = (file) => readImage(file, { what: 'Logo', max: MAX_LOGO, maxLabel: '300 KB' });
const readCover = (file) => readImage(file, { what: 'Gambar sampul', max: MAX_COVER, maxLabel: '1 MB', types: COVER_TYPES, typesLabel: 'PNG, JPG, atau WEBP' });
// Logo aplikasi juga dipakai untuk favicon & ikon PWA; pembuat ikon (next/og) tidak mendukung WEBP.
const readAppLogo = (file) =>
  readImage(file, { what: 'Logo', max: MAX_LOGO, maxLabel: '300 KB', types: ['image/png', 'image/jpeg', 'image/svg+xml'], typesLabel: 'PNG, JPG, atau SVG' });

const styleFromForm = (fd) =>
  JSON.stringify(
    sanitizeStyle({
      font: fd.get('font'),
      background: fd.get('background'),
      corners: fd.get('corners'),
      button_label: fd.get('button_label'),
    })
  );

export async function createBrand(_prev, fd) {
  await requireAdmin();
  const name = String(fd.get('name') || '').trim().slice(0, 80);
  const color = HEX.test(String(fd.get('color'))) ? String(fd.get('color')) : '#0f766e';
  if (!name) return { error: 'Nama brand wajib diisi.' };
  const logo = await readLogo(fd.get('logo'));
  if (!logo.ok) return { error: logo.error };
  const cover = await readCover(fd.get('cover'));
  if (!cover.ok) return { error: cover.error };
  await db.run('INSERT INTO brands (name,color,logo,cover,style) VALUES (?,?,?,?,?)', name, color, logo.value, cover.value, styleFromForm(fd));
  revalidatePath('/dashboard/brands');
  return { ok: `Brand ${name} ditambahkan.` };
}

export async function updateBrand(_prev, fd) {
  const user = await requireUser();
  const id = Number(fd.get('id'));
  if (user.role !== 'admin' && user.brand_id !== id) return { error: 'Tidak punya akses.' };
  const brand = await db.get('SELECT * FROM brands WHERE id=?', id);
  if (!brand) return { error: 'Brand tidak ditemukan.' };
  const name = String(fd.get('name') || '').trim().slice(0, 80);
  const color = HEX.test(String(fd.get('color'))) ? String(fd.get('color')) : brand.color;
  if (!name) return { error: 'Nama brand wajib diisi.' };
  const logo = await readLogo(fd.get('logo'));
  if (!logo.ok) return { error: logo.error };
  const cover = await readCover(fd.get('cover'));
  if (!cover.ok) return { error: cover.error };
  const removeLogo = fd.get('remove_logo') === 'on';
  const removeCover = fd.get('remove_cover') === 'on';
  await db.run(
    'UPDATE brands SET name=?, color=?, logo=?, cover=?, style=? WHERE id=?',
    name,
    color,
    removeLogo ? null : logo.value ?? brand.logo,
    removeCover ? null : cover.value ?? brand.cover,
    styleFromForm(fd),
    id
  );
  revalidatePath('/dashboard/brands');
  return { ok: 'Tersimpan.' };
}

/* ---------- pengaturan aplikasi (admin) ---------- */

export async function saveAppSettings(_prev, fd) {
  await requireAdmin();
  const appName = String(fd.get('app_name') || '').trim().slice(0, 40);
  const tagline = String(fd.get('tagline') || '').trim().slice(0, 160);
  const primary = String(fd.get('primary') || '');
  const iconBg = String(fd.get('icon_bg') || '');
  if (!appName) return { error: 'Nama aplikasi wajib diisi.' };
  if (!HEX.test(primary) || !HEX.test(iconBg)) return { error: 'Warna tidak valid.' };
  const logo = await readAppLogo(fd.get('logo'));
  if (!logo.ok) return { error: logo.error };

  const values = { app_name: appName, tagline, primary, icon_bg: iconBg, show_name: fd.get('show_name') === 'on' ? '1' : '0' };
  if (logo.value) values.logo = logo.value;
  await db.tx(async (t) => {
    for (const [key, value] of Object.entries(values)) {
      if (value) await t.run('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value', key, value);
      else await t.run('DELETE FROM settings WHERE key=?', key);
    }
    if (fd.get('remove_logo') === 'on' && !logo.value) await t.run("DELETE FROM settings WHERE key='logo'");
  });
  revalidatePath('/', 'layout');
  return { ok: 'Tersimpan.' };
}

export async function resetAppSettings() {
  await requireAdmin();
  await db.run('DELETE FROM settings');
  revalidatePath('/', 'layout');
}

// Ganti link undangan brand; link lama langsung tidak berlaku.
export async function rotateInvite(fd) {
  const user = await requireUser();
  const id = Number(fd.get('id'));
  if (user.role !== 'admin' && user.brand_id !== id) return;
  await db.run("UPDATE brands SET invite_token=replace(gen_random_uuid()::text, '-', '') WHERE id=?", id);
  revalidatePath('/dashboard/brands');
}

export async function createBrandUser(_prev, fd) {
  await requireAdmin();
  const brandId = Number(fd.get('brand_id'));
  const email = String(fd.get('email') || '').trim().toLowerCase();
  const name = String(fd.get('name') || '').trim().slice(0, 80);
  const password = String(fd.get('password') || '');
  if (!(await db.get('SELECT 1 FROM brands WHERE id=?', brandId))) return { error: 'Brand tidak ditemukan.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Format email tidak valid.' };
  if (!name) return { error: 'Nama wajib diisi.' };
  if (password && password.length < 8) return { error: 'Password minimal 8 karakter, atau kosongkan untuk akun khusus login Google.' };
  if (await db.get('SELECT 1 FROM users WHERE email=?', email)) return { error: 'Email sudah terdaftar.' };
  await db.run(
    "INSERT INTO users (email,name,password_hash,role,brand_id) VALUES (?,?,?,'brand',?)",
    email,
    name,
    password ? bcrypt.hashSync(password, 10) : '',
    brandId
  );
  revalidatePath('/dashboard/brands');
  return { ok: `Akun ${email} dibuat.` };
}

export async function resetUserPassword(_prev, fd) {
  await requireAdmin();
  const id = Number(fd.get('user_id'));
  const password = String(fd.get('password') || '');
  if (password.length < 8) return { error: 'Password minimal 8 karakter.' };
  const r = await db.run("UPDATE users SET password_hash=? WHERE id=? AND role='brand'", bcrypt.hashSync(password, 10), id);
  return r.changes ? { ok: 'Password diganti.' } : { error: 'User tidak ditemukan.' };
}

export async function deleteBrandUser(fd) {
  await requireAdmin();
  await db.run("DELETE FROM users WHERE id=? AND role='brand'", Number(fd.get('user_id')));
  revalidatePath('/dashboard/brands');
}

/* ---------- forms ---------- */

export async function createForm(fd) {
  const user = await requireUser();
  const brandId = user.role === 'admin' ? Number(fd.get('brand_id')) : user.brand_id;
  if (!brandId || !(await db.get('SELECT 1 FROM brands WHERE id=?', brandId))) redirect('/dashboard');
  const slug = crypto.randomBytes(5).toString('hex');
  const r = await db.get(
    'INSERT INTO forms (brand_id,slug,title,description,questions) VALUES (?,?,?,?,?) RETURNING id',
    brandId, slug, 'Survey affiliate tanpa judul', '', JSON.stringify(defaultQuestions())
  );
  redirect(`/dashboard/forms/${r.id}`);
}

export async function saveForm(id, payload) {
  const user = await requireUser();
  const form = await getAccessibleForm(user, id);
  if (!form) return { error: 'Form tidak ditemukan.' };
  const title = String(payload?.title || '').trim().slice(0, 200);
  if (!title) return { error: 'Judul form wajib diisi.' };
  await db.run(
    'UPDATE forms SET title=?, description=?, thank_you=?, is_active=?, questions=?, updated_at=utc_now() WHERE id=?',
    title,
    String(payload?.description || '').slice(0, 2000),
    String(payload?.thank_you || '').slice(0, 1000) || 'Terima kasih, jawaban kamu sudah kami terima.',
    payload?.is_active ? 1 : 0,
    JSON.stringify(sanitizeQuestions(payload?.questions)),
    form.id
  );
  revalidatePath('/dashboard');
  return { ok: true };
}

// Salin pertanyaan dan pengaturan form ke form baru (jawaban tidak ikut).
// Admin boleh menyalin ke brand lain lewat field brand_id.
export async function duplicateForm(fd) {
  const user = await requireUser();
  const form = await getAccessibleForm(user, fd.get('id'));
  if (!form) redirect('/dashboard');
  const brandId = user.role === 'admin' && fd.get('brand_id') ? Number(fd.get('brand_id')) : form.brand_id;
  if (!(await db.get('SELECT 1 FROM brands WHERE id=?', brandId))) redirect('/dashboard');
  const slug = crypto.randomBytes(5).toString('hex');
  const r = await db.get(
    'INSERT INTO forms (brand_id,slug,title,description,thank_you,questions,is_active) VALUES (?,?,?,?,?,?,?) RETURNING id',
    brandId, slug, `${form.title} (salinan)`.slice(0, 200), form.description, form.thank_you, form.questions, form.is_active
  );
  redirect(`/dashboard/forms/${r.id}`);
}

export async function deleteForm(fd) {
  const user = await requireUser();
  const form = await getAccessibleForm(user, fd.get('id'));
  if (form) await db.run('DELETE FROM forms WHERE id=?', form.id);
  redirect('/dashboard');
}

export async function deleteResponse(fd) {
  const user = await requireUser();
  const row = await db.get('SELECT id, form_id FROM responses WHERE id=?', Number(fd.get('id')));
  if (row && (await getAccessibleForm(user, row.form_id))) {
    await db.run('DELETE FROM responses WHERE id=?', row.id);
    revalidatePath(`/dashboard/forms/${row.form_id}/responses`);
  }
}

/* ---------- pengiriman barang ---------- */

// Simpan status pengiriman satu pengisi; setiap perubahan dicatat di shipment_events (track record).
export async function updateShipment(_prev, fd) {
  const user = await requireUser();
  const responseId = Number(fd.get('response_id'));
  const row = await db.get('SELECT id, form_id FROM responses WHERE id=?', responseId);
  if (!row || !(await getAccessibleForm(user, row.form_id))) return { error: 'Data pengisi tidak ditemukan.' };
  const status = String(fd.get('status') || '');
  if (!isStatus(status)) return { error: 'Status tidak valid.' };
  const items = String(fd.get('items') || '').trim().slice(0, 500);
  const courier = String(fd.get('courier') || '').trim().slice(0, 50);
  const trackingNo = String(fd.get('tracking_no') || '').trim().slice(0, 60);
  const note = String(fd.get('note') || '').trim().slice(0, 500);
  const notePublic = note && fd.get('note_public') === 'on' ? 1 : 0;

  const prev = await db.get('SELECT * FROM shipments WHERE response_id=?', responseId);
  const changed =
    !prev || prev.status !== status || prev.items !== items || prev.courier !== courier || prev.tracking_no !== trackingNo;
  if (!changed && !note) return { error: 'Tidak ada perubahan untuk disimpan.' };

  await db.tx(async (t) => {
    let shipmentId = prev?.id;
    if (prev) {
      await t.run(
        'UPDATE shipments SET status=?, items=?, courier=?, tracking_no=?, updated_at=utc_now() WHERE id=?',
        status, items, courier, trackingNo, prev.id
      );
    } else {
      shipmentId = (
        await t.get(
          'INSERT INTO shipments (response_id,status,items,courier,tracking_no) VALUES (?,?,?,?,?) RETURNING id',
          responseId, status, items, courier, trackingNo
        )
      ).id;
    }
    await t.run(
      'INSERT INTO shipment_events (shipment_id,status,note,is_public,courier,tracking_no,actor) VALUES (?,?,?,?,?,?,?)',
      shipmentId,
      status,
      note,
      notePublic,
      courier,
      trackingNo,
      user.name || user.email
    );
  });
  revalidatePath('/dashboard', 'layout');
  return { ok: 'Tersimpan.' };
}

/* ---------- public submit ---------- */

export async function submitResponse(_prev, fd) {
  const slug = String(fd.get('slug') || '');
  const form = await db.get('SELECT * FROM forms WHERE slug=?', slug);
  if (!form || !form.is_active) return { error: 'Form ini sedang tidak menerima jawaban.' };
  if (fd.get('website')) return { done: true }; // honeypot

  const questions = JSON.parse(form.questions);
  const answers = {};
  const uploads = [];
  const missing = [];

  for (const q of questions) {
    const key = `q_${q.id}`;
    let value = null;

    if (q.type === 'checkbox') {
      const picked = fd.getAll(key).map(String).filter((v) => q.options.includes(v));
      value = picked.length ? picked : null;
    } else if (q.type === 'file') {
      const f = fd.get(key);
      if (f && typeof f !== 'string' && f.size > 0) {
        if (f.size > MAX_FILE) return { error: `File "${q.label}" melebihi 3 MB.` };
        uploads.push({ qid: q.id, file: f });
        value = { file: true, name: String(f.name).slice(0, 200) };
      }
    } else {
      const raw = String(fd.get(key) ?? '').trim();
      if (raw) {
        if (HAS_OPTIONS.includes(q.type)) {
          if (!q.options.includes(raw)) return { error: `Pilihan pada "${q.label}" tidak valid.` };
          value = raw;
        } else if (q.type === 'rating') {
          const n = Number(raw);
          if (!Number.isInteger(n) || n < 1 || n > 5) return { error: `Rating pada "${q.label}" tidak valid.` };
          value = n;
        } else {
          value = raw.slice(0, q.type === 'long' ? 5000 : 500);
        }
      }
    }

    if (q.required && value === null) missing.push(q.label);
    if (value !== null) answers[q.id] = value;
  }

  if (missing.length) return { error: `Mohon lengkapi: ${missing.join(', ')}` };

  const token = newTrackToken();
  const fileRows = [];
  for (const u of uploads) {
    fileRows.push({
      qid: u.qid,
      name: String(u.file.name).slice(0, 200),
      mime: u.file.type || 'application/octet-stream',
      buf: Buffer.from(await u.file.arrayBuffer()),
    });
  }
  await db.tx(async (t) => {
    const { id: rid } = await t.get('INSERT INTO responses (form_id,answers,track_token) VALUES (?,?,?) RETURNING id', form.id, '{}', token);
    for (const u of fileRows) {
      const fr = await t.get('INSERT INTO files (response_id,name,mime,data) VALUES (?,?,?,?) RETURNING id', rid, u.name, u.mime, u.buf);
      answers[u.qid] = { file: true, name: u.name, id: fr.id };
    }
    await t.run('UPDATE responses SET answers=? WHERE id=?', JSON.stringify(answers), rid);
  });
  return { done: true, track: token };
}
