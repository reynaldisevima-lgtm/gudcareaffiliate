// Data talent KOL: validasi, penyamaran data sensitif, dan pengecekan akses.
import { PROVINCES } from '@/lib/address';

export const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'X (Twitter)', 'Facebook', 'Threads', 'Shopee Video', 'Lainnya'];

export const BANKS = ['BCA', 'BRI', 'BNI', 'Mandiri', 'BSI', 'CIMB Niaga', 'Permata', 'Danamon', 'BTN', 'OCBC', 'Jago', 'SeaBank', 'Blu by BCA', 'Jenius (SMBC)'];

const digits = (v) => String(v || '').replace(/\D/g, '');

// NPWP 15 digit: 99.999.999.9-999.999; NPWP 16 digit (berbasis NIK) ditampilkan per 4 angka.
export function formatNpwp(v) {
  const d = digits(v);
  if (d.length === 15) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}.${d.slice(8, 9)}-${d.slice(9, 12)}.${d.slice(12)}`;
  return d.replace(/(\d{4})(?=\d)/g, '$1 ');
}

// Hanya 4 angka terakhir yang terlihat.
export const mask = (v) => (digits(v) ? `•••• ${digits(v).slice(-4)}` : '-');

export const parseKol = (k) => ({ ...k, address: JSON.parse(k.address || '{}'), socials: JSON.parse(k.socials || '[]') });

// Baca isian form KOL. NPWP / no. rekening kosong saat mengubah data = tidak diubah (keep).
// Hasil: { value } atau { error }.
export function readKolForm(fd, { editing = false } = {}) {
  const text = (k, max) => String(fd.get(k) || '').trim().slice(0, max);
  const v = {
    name: text('name', 100),
    phone: text('phone', 25).replace(/[^0-9+()\- ]/g, ''),
    email: text('email', 120).toLowerCase(),
    notes: text('notes', 1000),
    bank_name: text('bank_name', 60),
    bank_holder: text('bank_holder', 100),
  };
  if (!v.name) return { error: 'Nama KOL wajib diisi.' };
  if (digits(v.phone).length < 8) return { error: 'No. HP/WhatsApp wajib diisi (minimal 8 angka).' };
  if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) return { error: 'Format email tidak valid.' };

  const address = { province: text('addr_province', 60), city: text('addr_city', 100), street: text('addr_street', 500), postal: text('addr_postal', 5) };
  if (!address.province || !address.city || !address.street || !address.postal) return { error: 'Lengkapi alamat: provinsi, kota/kabupaten, alamat lengkap, dan kode pos.' };
  if (!PROVINCES.includes(address.province)) return { error: 'Provinsi tidak valid.' };
  if (!/^\d{5}$/.test(address.postal)) return { error: 'Kode pos harus 5 angka.' };
  v.address = JSON.stringify(address);

  const platforms = fd.getAll('social_platform').map(String);
  const usernames = fd.getAll('social_username').map((u) => String(u).trim().replace(/^@/, '').slice(0, 80));
  const followers = fd.getAll('social_followers').map((f) => digits(f).slice(0, 12));
  const socials = usernames
    .map((username, i) => ({ platform: PLATFORMS.includes(platforms[i]) ? platforms[i] : 'Lainnya', username, followers: followers[i] ? Number(followers[i]) : null }))
    .filter((s) => s.username)
    .slice(0, 10);
  if (!socials.length) return { error: 'Isi minimal satu akun sosial media.' };
  v.socials = JSON.stringify(socials);

  const npwp = digits(fd.get('npwp'));
  if (npwp && npwp.length !== 15 && npwp.length !== 16) return { error: 'NPWP harus 15 atau 16 angka.' };
  const account = digits(fd.get('bank_account'));
  if (account && (account.length < 5 || account.length > 20)) return { error: 'No. rekening harus 5 sampai 20 angka.' };
  if (account && (!v.bank_name || !v.bank_holder)) return { error: 'Lengkapi nama bank dan nama pemilik rekening.' };
  // Saat mengubah: kosong = biarkan nilai lama.
  if (npwp || !editing) v.npwp = npwp;
  if (account || !editing) v.bank_account = account;
  return { value: v };
}
