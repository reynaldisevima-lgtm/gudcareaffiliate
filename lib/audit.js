import { headers } from 'next/headers';
import { db } from '@/lib/db';

// Jenis aktivitas yang dicatat. kind menentukan warna label dan filter di halaman Log aktivitas.
export const ACTIONS = {
  login: { label: 'Login', kind: 'masuk' },
  'login.google': { label: 'Login Google', kind: 'masuk' },
  'login.failed': { label: 'Login gagal', kind: 'masuk' },
  'join.invite': { label: 'Bergabung lewat undangan', kind: 'buat' },
  'brand.create': { label: 'Brand dibuat', kind: 'buat' },
  'brand.update': { label: 'Brand diubah', kind: 'ubah' },
  'brand.invite_rotate': { label: 'Link undangan diganti', kind: 'ubah' },
  'user.create': { label: 'Akun dibuat', kind: 'buat' },
  'user.password': { label: 'Password diganti', kind: 'ubah' },
  'user.delete': { label: 'Akun dihapus', kind: 'hapus' },
  'form.create': { label: 'Form dibuat', kind: 'buat' },
  'form.update': { label: 'Form diubah', kind: 'ubah' },
  'form.duplicate': { label: 'Form disalin', kind: 'buat' },
  'form.delete': { label: 'Form dihapus', kind: 'hapus' },
  'form.restore': { label: 'Form dipulihkan', kind: 'pulih' },
  'form.revert': { label: 'Isi form dikembalikan', kind: 'pulih' },
  'response.delete': { label: 'Jawaban dihapus', kind: 'hapus' },
  'response.restore': { label: 'Jawaban dipulihkan', kind: 'pulih' },
  'shipment.update': { label: 'Pengiriman diperbarui', kind: 'ubah' },
  'settings.update': { label: 'Pengaturan aplikasi diubah', kind: 'ubah' },
  'settings.reset': { label: 'Pengaturan aplikasi direset', kind: 'ubah' },
  'report.export': { label: 'Laporan diunduh', kind: 'unduh' },
};

export const KINDS = [
  { value: 'hapus', label: 'Hapus' },
  { value: 'buat', label: 'Buat' },
  { value: 'ubah', label: 'Ubah' },
  { value: 'pulih', label: 'Pulihkan' },
  { value: 'masuk', label: 'Login' },
  { value: 'unduh', label: 'Unduh laporan' },
];

// Catat satu aktivitas. Kegagalan mencatat tidak membatalkan aksi pengguna (hanya dicetak ke log server).
export async function audit(user, { action, summary, brandId = null, target = null, details = null }) {
  try {
    let ip = null;
    try { ip = ((await headers()).get('x-forwarded-for') || '').split(',')[0].trim() || null; } catch {}
    await db.run(
      'INSERT INTO audit_logs (actor_id,actor_email,actor_name,actor_role,brand_id,action,target_type,target_id,summary,details,ip) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      user?.id ?? null, user?.email ?? null, user?.name ?? null, user?.role ?? null, brandId,
      action, target?.type ?? null, target?.id ?? null, String(summary).slice(0, 500),
      details ? JSON.stringify(details) : null, ip
    );
  } catch (e) {
    console.error('Gagal mencatat log aktivitas:', action, e.message);
  }
}

const short = (v) => { const s = String(v ?? ''); return s.length > 80 ? s.slice(0, 77) + '...' : s; };

// Perubahan isi form (judul, deskripsi, pesan, status, pertanyaan) dalam bentuk yang mudah dibaca.
export function diffForm(before, after) {
  const changes = [];
  if (before.title !== after.title) changes.push({ field: 'Judul', from: short(before.title), to: short(after.title) });
  if (before.description !== after.description) changes.push({ field: 'Deskripsi', from: short(before.description), to: short(after.description) });
  if (before.thank_you !== after.thank_you) changes.push({ field: 'Pesan setelah dikirim', from: short(before.thank_you), to: short(after.thank_you) });
  if (!!before.is_active !== !!after.is_active) changes.push({ field: 'Status', from: before.is_active ? 'Menerima jawaban' : 'Ditutup', to: after.is_active ? 'Menerima jawaban' : 'Ditutup' });
  const qb = JSON.parse(before.questions), qa = JSON.parse(after.questions);
  const byId = (list) => new Map(list.map((q) => [q.id, q]));
  const mb = byId(qb), ma = byId(qa);
  const added = qa.filter((q) => !mb.has(q.id)).map((q) => q.label);
  const removed = qb.filter((q) => !ma.has(q.id)).map((q) => q.label);
  const edited = qa.filter((q) => mb.has(q.id) && JSON.stringify(q) !== JSON.stringify(mb.get(q.id))).map((q) => q.label);
  const reordered = !added.length && !removed.length && qa.map((q) => q.id).join() !== qb.filter((q) => ma.has(q.id)).map((q) => q.id).join();
  if (added.length) changes.push({ field: 'Pertanyaan ditambah', list: added });
  if (removed.length) changes.push({ field: 'Pertanyaan dihapus', list: removed });
  if (edited.length) changes.push({ field: 'Pertanyaan diubah', list: edited });
  if (reordered) changes.push({ field: 'Urutan pertanyaan', to: 'diubah' });
  return changes;
}

// Ringkasan perubahan di daftar perubahan: "Judul, Pertanyaan dihapus".
export const changeNames = (changes) => changes.map((c) => c.field.toLowerCase()).join(', ');
