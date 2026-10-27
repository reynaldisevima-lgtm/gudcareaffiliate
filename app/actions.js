'use server';

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db, newTrackToken } from '@/lib/db';
import { createSession, requireUser, requireAdmin, getAccessibleForm, getAccessibleBrand, getAccessibleKol, canAffiliate, canKol, ACCESS, accessLabel } from '@/lib/auth';
import { readKolForm, formatNpwp } from '@/lib/kol';
import { defaultQuestions, sanitizeQuestions, HAS_OPTIONS, MAX_FILE } from '@/lib/questions';
import { sanitizeStyle } from '@/lib/brandStyle';
import { isStatus, statusLabel, respondent } from '@/lib/shipping';
import { audit, diffForm, changeNames } from '@/lib/audit';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { readAddress } from '@/lib/address';

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
    await audit(null, { action: 'login.failed', summary: `Login password gagal untuk ${email || '(email kosong)'}` });
    return { error: 'Email atau password salah.' };
  }
  await createSession(user.id);
  await audit(user, { action: 'login', summary: `${user.email} masuk dengan email & password`, brandId: user.brand_id });
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

// No. HP: hanya angka, spasi, +, -, dan tanda kurung; maksimal 25 karakter.
const cleanPhone = (v) => String(v || '').replace(/[^0-9+()\- ]/g, '').trim().slice(0, 25);

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
  const admin = await requireAdmin();
  const name = String(fd.get('name') || '').trim().slice(0, 80);
  const color = HEX.test(String(fd.get('color'))) ? String(fd.get('color')) : '#0f766e';
  if (!name) return { error: 'Nama brand wajib diisi.' };
  const logo = await readLogo(fd.get('logo'));
  if (!logo.ok) return { error: logo.error };
  const cover = await readCover(fd.get('cover'));
  if (!cover.ok) return { error: cover.error };
  const b = await db.get(
    'INSERT INTO brands (workspace_id,name,color,phone,logo,cover,style) VALUES (?,?,?,?,?,?,?) RETURNING id',
    admin.workspace_id, name, color, cleanPhone(fd.get('phone')), logo.value, cover.value, styleFromForm(fd)
  );
  await audit(admin, { action: 'brand.create', summary: `Menambah brand ${name}`, brandId: b.id, target: { type: 'brand', id: b.id } });
  revalidatePath('/dashboard/brands', 'layout');
  redirect(`/dashboard/brands/${b.id}`);
}

export async function updateBrand(_prev, fd) {
  const user = await requireUser();
  const id = Number(fd.get('id'));
  const brand = await getAccessibleBrand(user, id);
  if (!brand) return { error: 'Brand tidak ditemukan atau tidak punya akses.' };
  const name = String(fd.get('name') || '').trim().slice(0, 80);
  const color = HEX.test(String(fd.get('color'))) ? String(fd.get('color')) : brand.color;
  if (!name) return { error: 'Nama brand wajib diisi.' };
  const logo = await readLogo(fd.get('logo'));
  if (!logo.ok) return { error: logo.error };
  const cover = await readCover(fd.get('cover'));
  if (!cover.ok) return { error: cover.error };
  const removeLogo = fd.get('remove_logo') === 'on';
  const removeCover = fd.get('remove_cover') === 'on';
  const phone = cleanPhone(fd.get('phone'));
  await db.run(
    'UPDATE brands SET name=?, color=?, phone=?, logo=?, cover=?, style=? WHERE id=?',
    name,
    color,
    phone,
    removeLogo ? null : logo.value ?? brand.logo,
    removeCover ? null : cover.value ?? brand.cover,
    styleFromForm(fd),
    id
  );
  const changed = [
    name !== brand.name && 'nama',
    color !== brand.color && 'warna',
    phone !== (brand.phone || '') && 'no. HP',
    (logo.value || removeLogo) && 'logo',
    (cover.value || removeCover) && 'sampul',
    styleFromForm(fd) !== JSON.stringify(sanitizeStyle(JSON.parse(brand.style || '{}'))) && 'tampilan form',
  ].filter(Boolean);
  if (changed.length) {
    await audit(user, {
      action: 'brand.update',
      summary: `Mengubah brand ${name}: ${changed.join(', ')}`,
      brandId: id,
      target: { type: 'brand', id },
      details: { changes: name !== brand.name ? [{ field: 'Nama brand', from: brand.name, to: name }] : [] },
    });
  }
  revalidatePath('/dashboard/brands', 'layout');
  return { ok: 'Tersimpan.' };
}

/* ---------- pengaturan aplikasi (admin) ---------- */

export async function saveAppSettings(_prev, fd) {
  const admin = await requireAdmin();
  const ws = admin.workspace_id;
  const before = Object.fromEntries((await db.all('SELECT key, value FROM app_settings WHERE workspace_id=?', ws)).map((r) => [r.key, r.value]));
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
      if (value) await t.run('INSERT INTO app_settings (workspace_id,key,value) VALUES (?,?,?) ON CONFLICT (workspace_id,key) DO UPDATE SET value=EXCLUDED.value', ws, key, value);
      else await t.run('DELETE FROM app_settings WHERE workspace_id=? AND key=?', ws, key);
    }
    if (fd.get('remove_logo') === 'on' && !logo.value) await t.run("DELETE FROM app_settings WHERE workspace_id=? AND key='logo'", ws);
  });
  const LABELS = { app_name: 'nama aplikasi', tagline: 'teks login', primary: 'warna utama', icon_bg: 'latar ikon', show_name: 'tampilkan nama' };
  const changed = Object.keys(LABELS).filter((k) => (before[k] ?? DEFAULT_SETTINGS[k] ?? '') !== (values[k] || DEFAULT_SETTINGS[k] || ''));
  if (logo.value || (fd.get('remove_logo') === 'on' && before.logo)) changed.push('logo');
  if (changed.length) await audit(admin, { action: 'settings.update', summary: `Mengubah pengaturan aplikasi: ${changed.map((k) => LABELS[k] || k).join(', ')}` });
  revalidatePath('/', 'layout');
  return { ok: 'Tersimpan.' };
}

export async function resetAppSettings() {
  const admin = await requireAdmin();
  await db.run('DELETE FROM app_settings WHERE workspace_id=?', admin.workspace_id);
  await audit(admin, { action: 'settings.reset', summary: 'Mengembalikan nama, logo, dan warna aplikasi ke bawaan' });
  revalidatePath('/', 'layout');
}

// Ganti link undangan brand; link lama langsung tidak berlaku.
export async function rotateInvite(fd) {
  const user = await requireUser();
  const id = Number(fd.get('id'));
  if (!(await getAccessibleBrand(user, id))) return;
  const b = await db.get("UPDATE brands SET invite_token=replace(gen_random_uuid()::text, '-', '') WHERE id=? RETURNING name", id);
  if (b) await audit(user, { action: 'brand.invite_rotate', summary: `Mengganti link undangan brand ${b.name} (link lama tidak berlaku)`, brandId: id, target: { type: 'brand', id } });
  revalidatePath('/dashboard/brands', 'layout');
}

export async function createBrandUser(_prev, fd) {
  const admin = await requireAdmin();
  const brandId = Number(fd.get('brand_id'));
  const email = String(fd.get('email') || '').trim().toLowerCase();
  const name = String(fd.get('name') || '').trim().slice(0, 80);
  const password = String(fd.get('password') || '');
  const access = ACCESS.some((a) => a.value === fd.get('access')) ? String(fd.get('access')) : 'all';
  const brand = await getAccessibleBrand(admin, brandId);
  if (!brand) return { error: 'Brand tidak ditemukan.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Format email tidak valid.' };
  if (!name) return { error: 'Nama wajib diisi.' };
  if (password && password.length < 8) return { error: 'Password minimal 8 karakter, atau kosongkan untuk akun khusus login Google.' };
  if (await db.get('SELECT 1 FROM users WHERE email=?', email)) return { error: 'Email sudah terdaftar.' };
  await db.run(
    "INSERT INTO users (email,name,password_hash,role,brand_id,workspace_id,access) VALUES (?,?,?,'brand',?,?,?)",
    email,
    name,
    password ? bcrypt.hashSync(password, 10) : '',
    brandId,
    admin.workspace_id,
    access
  );
  await audit(admin, { action: 'user.create', summary: `Membuat akun ${email} (${name}) untuk brand ${brand.name}, akses ${accessLabel(access)}${password ? '' : ', khusus login Google'}`, brandId });
  revalidatePath('/dashboard/brands', 'layout');
  return { ok: `Akun ${email} dibuat.` };
}

// Atur akses akun tim brand: affiliate saja, KOL saja, atau keduanya.
export async function setUserAccess(_prev, fd) {
  const admin = await requireAdmin();
  const access = String(fd.get('access') || '');
  if (!ACCESS.some((a) => a.value === access)) return { error: 'Pilihan akses tidak valid.' };
  const id = Number(fd.get('user_id'));
  const prev = await db.get(
    "SELECT email, access, brand_id FROM users WHERE id=? AND role='brand' AND brand_id IN (SELECT id FROM brands WHERE workspace_id=?)",
    id, admin.workspace_id
  );
  if (!prev) return { error: 'User tidak ditemukan.' };
  if (prev.access === access) return { ok: 'Tidak ada perubahan.' };
  await db.run('UPDATE users SET access=? WHERE id=?', access, id);
  await audit(admin, {
    action: 'user.access',
    summary: `Mengubah akses akun ${prev.email} menjadi ${accessLabel(access)}`,
    brandId: prev.brand_id,
    details: { changes: [{ field: 'Akses', from: accessLabel(prev.access), to: accessLabel(access) }] },
  });
  revalidatePath('/dashboard/brands', 'layout');
  return { ok: 'Akses disimpan.' };
}

export async function resetUserPassword(_prev, fd) {
  const admin = await requireAdmin();
  const id = Number(fd.get('user_id'));
  const password = String(fd.get('password') || '');
  if (password.length < 8) return { error: 'Password minimal 8 karakter.' };
  const u = await db.get(
    "UPDATE users SET password_hash=? WHERE id=? AND role='brand' AND brand_id IN (SELECT id FROM brands WHERE workspace_id=?) RETURNING email, brand_id",
    bcrypt.hashSync(password, 10), id, admin.workspace_id
  );
  if (!u) return { error: 'User tidak ditemukan.' };
  await audit(admin, { action: 'user.password', summary: `Mengganti password akun ${u.email}`, brandId: u.brand_id });
  return { ok: 'Password diganti.' };
}

export async function deleteBrandUser(fd) {
  const admin = await requireAdmin();
  const u = await db.get(
    "DELETE FROM users WHERE id=? AND role='brand' AND brand_id IN (SELECT id FROM brands WHERE workspace_id=?) RETURNING email, name, brand_id, (SELECT name FROM brands WHERE id=users.brand_id) AS brand_name",
    Number(fd.get('user_id')), admin.workspace_id
  );
  if (u) {
    await audit(admin, {
      action: 'user.delete',
      summary: `Menghapus akun ${u.email} (${u.name}) dari brand ${u.brand_name}`,
      brandId: u.brand_id,
      details: { changes: [{ field: 'Akun', from: `${u.name} · ${u.email}`, to: 'dihapus (undang ulang lewat link undangan bila perlu)' }] },
    });
  }
  revalidatePath('/dashboard/brands', 'layout');
}

/* ---------- forms ---------- */

export async function createForm(fd) {
  const user = await requireUser();
  const brandId = user.role === 'admin' ? Number(fd.get('brand_id')) : user.brand_id;
  const brand = brandId && canAffiliate(user) && (await getAccessibleBrand(user, brandId));
  if (!brand) redirect('/dashboard');
  const slug = crypto.randomBytes(5).toString('hex');
  const r = await db.get(
    'INSERT INTO forms (brand_id,slug,title,description,questions) VALUES (?,?,?,?,?) RETURNING id',
    brandId, slug, 'Survey affiliate tanpa judul', '', JSON.stringify(defaultQuestions())
  );
  await audit(user, { action: 'form.create', summary: `Membuat form baru untuk brand ${brand.name}`, brandId, target: { type: 'form', id: r.id } });
  redirect(`/dashboard/forms/${r.id}`);
}

export async function saveForm(id, payload) {
  const user = await requireUser();
  const form = await getAccessibleForm(user, id);
  if (!form) return { error: 'Form tidak ditemukan.' };
  const title = String(payload?.title || '').trim().slice(0, 200);
  if (!title) return { error: 'Judul form wajib diisi.' };
  const next = {
    title,
    description: String(payload?.description || '').slice(0, 2000),
    thank_you: String(payload?.thank_you || '').slice(0, 1000) || 'Terima kasih, jawaban kamu sudah kami terima.',
    is_active: payload?.is_active ? 1 : 0,
    questions: JSON.stringify(sanitizeQuestions(payload?.questions)),
  };
  await db.run(
    'UPDATE forms SET title=?, description=?, thank_you=?, is_active=?, questions=?, updated_at=utc_now() WHERE id=?',
    next.title, next.description, next.thank_you, next.is_active, next.questions, form.id
  );
  const changes = diffForm(form, next);
  if (changes.length) {
    // before disimpan agar admin bisa mengembalikan isi form dari Log aktivitas.
    const before = { title: form.title, description: form.description, thank_you: form.thank_you, is_active: form.is_active, questions: form.questions };
    await audit(user, { action: 'form.update', summary: `Mengubah form "${next.title}": ${changeNames(changes)}`, brandId: form.brand_id, target: { type: 'form', id: form.id }, details: { changes, before } });
  }
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
  const brand = await getAccessibleBrand(user, brandId);
  if (!brand) redirect('/dashboard');
  const slug = crypto.randomBytes(5).toString('hex');
  const r = await db.get(
    'INSERT INTO forms (brand_id,slug,title,description,thank_you,questions,is_active) VALUES (?,?,?,?,?,?,?) RETURNING id',
    brandId, slug, `${form.title} (salinan)`.slice(0, 200), form.description, form.thank_you, form.questions, form.is_active
  );
  await audit(user, { action: 'form.duplicate', summary: `Menyalin form "${form.title}" ke brand ${brand.name}`, brandId, target: { type: 'form', id: r.id } });
  redirect(`/dashboard/forms/${r.id}`);
}

// Hapus = pindah ke sampah: data tetap ada dan admin bisa memulihkannya dari Log aktivitas.
export async function deleteForm(fd) {
  const user = await requireUser();
  const form = await getAccessibleForm(user, fd.get('id'));
  if (form) {
    await db.run('UPDATE forms SET deleted_at=utc_now() WHERE id=?', form.id);
    const { n } = await db.get('SELECT COUNT(*)::int AS n FROM responses WHERE form_id=? AND deleted_at IS NULL', form.id);
    await audit(user, { action: 'form.delete', summary: `Menghapus form "${form.title}" beserta ${n} jawaban`, brandId: form.brand_id, target: { type: 'form', id: form.id } });
  }
  redirect('/dashboard');
}

export async function deleteResponse(fd) {
  const user = await requireUser();
  const row = await db.get('SELECT id, form_id, answers FROM responses WHERE id=? AND deleted_at IS NULL', Number(fd.get('id')));
  const form = row && (await getAccessibleForm(user, row.form_id));
  if (form) {
    await db.run('UPDATE responses SET deleted_at=utc_now() WHERE id=?', row.id);
    const who = respondent(JSON.parse(form.questions), JSON.parse(row.answers), row.id).name;
    await audit(user, { action: 'response.delete', summary: `Menghapus jawaban ${who} di form "${form.title}"`, brandId: form.brand_id, target: { type: 'response', id: row.id } });
    revalidatePath(`/dashboard/forms/${row.form_id}/responses`);
  }
}

/* ---------- pemulihan (admin, dari Log aktivitas) ---------- */

export async function restoreForm(fd) {
  const admin = await requireAdmin();
  const form = await db.get(
    'UPDATE forms SET deleted_at=NULL WHERE id=? AND deleted_at IS NOT NULL AND brand_id IN (SELECT id FROM brands WHERE workspace_id=?) RETURNING id, title, brand_id',
    Number(fd.get('id')), admin.workspace_id
  );
  if (form) await audit(admin, { action: 'form.restore', summary: `Memulihkan form "${form.title}" beserta jawabannya`, brandId: form.brand_id, target: { type: 'form', id: form.id } });
  revalidatePath('/dashboard', 'layout');
}

export async function restoreResponse(fd) {
  const admin = await requireAdmin();
  const row = await db.get(
    'UPDATE responses r SET deleted_at=NULL FROM forms f JOIN brands b ON b.id=f.brand_id WHERE r.id=? AND r.deleted_at IS NOT NULL AND f.id=r.form_id AND b.workspace_id=? RETURNING r.id, r.answers, f.title, f.questions, f.brand_id',
    Number(fd.get('id')), admin.workspace_id
  );
  if (row) {
    const who = respondent(JSON.parse(row.questions), JSON.parse(row.answers), row.id).name;
    await audit(admin, { action: 'response.restore', summary: `Memulihkan jawaban ${who} di form "${row.title}"`, brandId: row.brand_id, target: { type: 'response', id: row.id } });
  }
  revalidatePath('/dashboard', 'layout');
}

// Kembalikan isi form (judul, deskripsi, pesan, status, pertanyaan) ke keadaan sebelum satu perubahan.
export async function revertForm(fd) {
  const admin = await requireAdmin();
  const log = await db.get("SELECT target_id, details FROM audit_logs WHERE id=? AND action='form.update' AND workspace_id=?", Number(fd.get('log_id')), admin.workspace_id);
  const before = log && JSON.parse(log.details || '{}').before;
  const form = before && (await getAccessibleForm(admin, log.target_id));
  if (!form) return;
  await db.run(
    'UPDATE forms SET title=?, description=?, thank_you=?, is_active=?, questions=?, updated_at=utc_now() WHERE id=?',
    before.title, before.description, before.thank_you, before.is_active, before.questions, form.id
  );
  const changes = diffForm(form, before);
  await audit(admin, { action: 'form.revert', summary: `Mengembalikan isi form "${before.title}" ke sebelum perubahan`, brandId: form.brand_id, target: { type: 'form', id: form.id }, details: { changes, before: { title: form.title, description: form.description, thank_you: form.thank_you, is_active: form.is_active, questions: form.questions } } });
  revalidatePath('/dashboard', 'layout');
}

/* ---------- pengiriman barang ---------- */

// Penerima pengiriman yang boleh diakses user: affiliate (fd response_id) atau KOL (fd kol_shipment_id).
async function shipmentTarget(user, fd) {
  const kolShipmentId = Number(fd.get('kol_shipment_id'));
  if (kolShipmentId) {
    const prev = await db.get('SELECT * FROM shipments WHERE id=? AND kol_id IS NOT NULL', kolShipmentId);
    const kol = prev && (await getAccessibleKol(user, prev.kol_id));
    return kol && { prev, who: kol.name, label: 'KOL', brandId: kol.brand_id, target: { type: 'kol', id: kol.id } };
  }
  const responseId = Number(fd.get('response_id'));
  const row = await db.get('SELECT id, form_id, answers FROM responses WHERE id=? AND deleted_at IS NULL', responseId);
  const form = row && (await getAccessibleForm(user, row.form_id));
  if (!form) return null;
  return {
    prev: await db.get('SELECT * FROM shipments WHERE response_id=?', responseId),
    responseId,
    who: respondent(JSON.parse(form.questions), JSON.parse(row.answers), row.id).name,
    label: form.title,
    brandId: form.brand_id,
    target: { type: 'response', id: row.id },
  };
}

// Simpan status pengiriman (affiliate atau KOL); setiap perubahan dicatat di shipment_events (track record).
export async function updateShipment(_prev, fd) {
  const user = await requireUser();
  const tg = await shipmentTarget(user, fd);
  if (!tg) return { error: 'Data penerima tidak ditemukan.' };
  const status = String(fd.get('status') || '');
  if (!isStatus(status)) return { error: 'Status tidak valid.' };
  const items = String(fd.get('items') || '').trim().slice(0, 500);
  const courier = String(fd.get('courier') || '').trim().slice(0, 50);
  const trackingNo = String(fd.get('tracking_no') || '').trim().slice(0, 60);
  const note = String(fd.get('note') || '').trim().slice(0, 500);
  const notePublic = note && fd.get('note_public') === 'on' ? 1 : 0;

  const prev = tg.prev;
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
          tg.responseId, status, items, courier, trackingNo
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
  await audit(user, {
    action: 'shipment.update',
    summary: `Pengiriman ${tg.who} (${tg.label}): ${prev && prev.status !== status ? `${statusLabel(prev.status)} → ` : ''}${statusLabel(status)}${trackingNo ? `, resi ${trackingNo}` : ''}`,
    brandId: tg.brandId,
    target: tg.target,
  });
  revalidatePath('/dashboard', 'layout');
  return { ok: 'Tersimpan.' };
}

/* ---------- data KOL ---------- */

// Tambah / ubah KOL. NPWP & no. rekening kosong saat mengubah = tidak diubah.
export async function saveKol(_prev, fd) {
  const user = await requireUser();
  const id = Number(fd.get('id')) || null;
  const existing = id ? await getAccessibleKol(user, id) : null;
  if (id && !existing) return { error: 'KOL tidak ditemukan.' };
  const brandId = existing ? existing.brand_id : user.role === 'admin' ? Number(fd.get('brand_id')) : user.brand_id;
  const brand = canKol(user) && (await getAccessibleBrand(user, brandId));
  if (!brand) return { error: 'Pilih brand.' };
  const r = readKolForm(fd, { editing: !!existing });
  if (r.error) return { error: r.error };
  const v = r.value;

  if (!existing) {
    const k = await db.get(
      'INSERT INTO kols (brand_id,name,phone,email,address,socials,npwp,bank_name,bank_account,bank_holder,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING id',
      brand.id, v.name, v.phone, v.email, v.address, v.socials, v.npwp, v.bank_name, v.bank_account, v.bank_holder, v.notes
    );
    await audit(user, { action: 'kol.create', summary: `Menambah KOL ${v.name} untuk brand ${brand.name}`, brandId: brand.id, target: { type: 'kol', id: k.id } });
    revalidatePath('/dashboard/kol', 'layout');
    redirect(`/dashboard/kol/${k.id}`);
  }

  const next = { ...existing, ...v };
  await db.run(
    'UPDATE kols SET name=?, phone=?, email=?, address=?, socials=?, npwp=?, bank_name=?, bank_account=?, bank_holder=?, notes=?, updated_at=utc_now() WHERE id=?',
    next.name, next.phone, next.email, next.address, next.socials, next.npwp, next.bank_name, next.bank_account, next.bank_holder, next.notes, existing.id
  );
  const LABELS = { name: 'nama', phone: 'no. HP', email: 'email', address: 'alamat', socials: 'sosial media', npwp: 'NPWP', bank_name: 'bank', bank_account: 'no. rekening', bank_holder: 'pemilik rekening', notes: 'catatan' };
  const changed = Object.keys(LABELS).filter((k) => String(existing[k] ?? '') !== String(next[k] ?? ''));
  if (changed.length) {
    await audit(user, { action: 'kol.update', summary: `Mengubah data KOL ${next.name}: ${changed.map((k) => LABELS[k]).join(', ')}`, brandId: existing.brand_id, target: { type: 'kol', id: existing.id } });
  }
  revalidatePath('/dashboard/kol', 'layout');
  return { ok: changed.length ? 'Tersimpan.' : 'Tidak ada perubahan.' };
}

// Hapus = pindah ke sampah; admin bisa memulihkan dari Log aktivitas.
export async function deleteKol(fd) {
  const user = await requireUser();
  const kol = await getAccessibleKol(user, fd.get('id'));
  if (kol) {
    await db.run('UPDATE kols SET deleted_at=utc_now() WHERE id=?', kol.id);
    await audit(user, { action: 'kol.delete', summary: `Menghapus data KOL ${kol.name} (brand ${kol.brand_name})`, brandId: kol.brand_id, target: { type: 'kol', id: kol.id } });
  }
  revalidatePath('/dashboard/kol', 'layout');
  redirect('/dashboard/kol');
}

export async function restoreKol(fd) {
  const admin = await requireAdmin();
  const kol = await getAccessibleKol(admin, fd.get('id'), { withDeleted: true });
  if (kol?.deleted_at) {
    await db.run('UPDATE kols SET deleted_at=NULL WHERE id=?', kol.id);
    await audit(admin, { action: 'kol.restore', summary: `Memulihkan data KOL ${kol.name}`, brandId: kol.brand_id, target: { type: 'kol', id: kol.id } });
  }
  revalidatePath('/dashboard', 'layout');
}

// Tampilkan NPWP & no. rekening lengkap. Setiap permintaan dicatat di Log aktivitas.
export async function revealKol(kolId) {
  const user = await requireUser();
  const kol = await getAccessibleKol(user, kolId);
  if (!kol) return { error: 'KOL tidak ditemukan.' };
  await audit(user, { action: 'kol.reveal', summary: `Melihat NPWP & no. rekening KOL ${kol.name}`, brandId: kol.brand_id, target: { type: 'kol', id: kol.id } });
  return { npwp: kol.npwp ? formatNpwp(kol.npwp) : '-', bank_account: kol.bank_account || '-' };
}

// Buat pengiriman baru ke KOL (mis. per campaign), lalu buka halamannya untuk diisi.
export async function createKolShipment(fd) {
  const user = await requireUser();
  const kol = await getAccessibleKol(user, fd.get('kol_id'));
  if (!kol) redirect('/dashboard/kol');
  const items = String(fd.get('items') || '').trim().slice(0, 500);
  const sh = await db.tx(async (t) => {
    const row = await t.get("INSERT INTO shipments (kol_id,status,items,track_token) VALUES (?,'pending',?,?) RETURNING id", kol.id, items, newTrackToken());
    await t.run("INSERT INTO shipment_events (shipment_id,status,note,actor) VALUES (?,'pending','Pengiriman dibuat',?)", row.id, user.name || user.email);
    return row;
  });
  await audit(user, { action: 'shipment.update', summary: `Membuat pengiriman baru untuk KOL ${kol.name}${items ? `: ${items}` : ''}`, brandId: kol.brand_id, target: { type: 'kol', id: kol.id } });
  revalidatePath('/dashboard', 'layout');
  redirect(`/dashboard/shipments/kol/${sh.id}`);
}

/* ---------- public submit ---------- */

export async function submitResponse(_prev, fd) {
  const slug = String(fd.get('slug') || '');
  const form = await db.get('SELECT * FROM forms WHERE slug=? AND deleted_at IS NULL', slug);
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
    } else if (q.type === 'address') {
      const a = readAddress(fd, key, q.label);
      if (a.error) return { error: a.error };
      value = a.value;
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
