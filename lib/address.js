// Pertanyaan tipe "Alamat pengiriman": provinsi, kota/kabupaten, alamat lengkap, kode pos.
// Disimpan sebagai { province, city, street, postal } di jawaban.

export const PROVINCES = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau', 'Jambi', 'Sumatera Selatan',
  'Kepulauan Bangka Belitung', 'Bengkulu', 'Lampung', 'DKI Jakarta', 'Jawa Barat', 'Banten', 'Jawa Tengah',
  'DI Yogyakarta', 'Jawa Timur', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Kalimantan Barat',
  'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara', 'Sulawesi Utara', 'Gorontalo',
  'Sulawesi Tengah', 'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tenggara', 'Maluku', 'Maluku Utara', 'Papua',
  'Papua Barat', 'Papua Barat Daya', 'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan',
];

export const ADDRESS_PARTS = [
  { key: 'province', label: 'Provinsi' },
  { key: 'city', label: 'Kota/Kabupaten' },
  { key: 'street', label: 'Alamat lengkap' },
  { key: 'postal', label: 'Kode pos' },
];

export const isAddress = (a) => !!a && typeof a === 'object' && !Array.isArray(a) && 'province' in a && 'postal' in a;

// "Jl. Melati 12, Kota Bandung, Jawa Barat 40115"
export const formatAddress = (a) => [a.street, a.city, [a.province, a.postal].filter(Boolean).join(' ')].filter(Boolean).join(', ');

// Baca & periksa isian alamat dari FormData (nama field: q_<id>_province, dst.).
// Hasil: { value } (null bila semua kosong) atau { error }.
export function readAddress(fd, key, label) {
  const raw = Object.fromEntries(ADDRESS_PARTS.map((p) => [p.key, String(fd.get(`${key}_${p.key}`) ?? '').trim()]));
  if (ADDRESS_PARTS.every((p) => !raw[p.key])) return { value: null };
  const missing = ADDRESS_PARTS.filter((p) => !raw[p.key]).map((p) => p.label.toLowerCase());
  if (missing.length) return { error: `Lengkapi ${missing.join(', ')} pada "${label}".` };
  if (!PROVINCES.includes(raw.province)) return { error: `Provinsi pada "${label}" tidak valid.` };
  if (!/^\d{5}$/.test(raw.postal)) return { error: `Kode pos pada "${label}" harus 5 angka.` };
  return { value: { province: raw.province, city: raw.city.slice(0, 100), street: raw.street.slice(0, 500), postal: raw.postal } };
}
