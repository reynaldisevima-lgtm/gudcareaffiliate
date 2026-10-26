// Status pengiriman barang contoh/sponsor ke pengisi form. Urutan = alur normal.
export const STATUSES = [
  { value: 'pending', label: 'Belum diproses' },
  { value: 'packed', label: 'Dikemas' },
  { value: 'shipped', label: 'Dikirim' },
  { value: 'delivered', label: 'Diterima' },
  { value: 'posted', label: 'Konten tayang' },
  { value: 'returned', label: 'Gagal / dikembalikan' },
];
export const FLOW = ['pending', 'packed', 'shipped', 'delivered', 'posted'];

export const COURIERS = ['JNE', 'J&T Express', 'SiCepat', 'AnterAja', 'Ninja Xpress', 'Pos Indonesia', 'ID Express', 'Lion Parcel', 'GoSend', 'GrabExpress'];

export const statusLabel = (v) => STATUSES.find((s) => s.value === v)?.label || 'Belum diproses';
export const isStatus = (v) => STATUSES.some((s) => s.value === v);

// Nama pengisi = jawaban singkat pertama; info kedua = jawaban singkat berikutnya (mis. WhatsApp).
export function respondent(questions, answers, responseId) {
  const shorts = questions.filter((q) => q.type === 'short').map((q) => answers[q.id]).filter((v) => typeof v === 'string' && v.trim());
  return { name: shorts[0] || `Pengisi #${responseId}`, detail: shorts[1] || '' };
}

const digits = (v) => String(v || '').replace(/\D/g, '').replace(/^(62|0)/, '');

// Orang yang sama: nomor HP sama (abaikan format 08/62), atau nama sama bila nomor tidak ada.
export function samePerson(a, b) {
  const pa = digits(a.detail);
  const pb = digits(b.detail);
  if (pa.length >= 8 && pb.length >= 8) return pa === pb;
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase() && !a.name.startsWith('Pengisi #');
}
