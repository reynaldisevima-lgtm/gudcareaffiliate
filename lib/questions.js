export const TYPES = [
  { value: 'short', label: 'Jawaban singkat' },
  { value: 'long', label: 'Paragraf' },
  { value: 'choice', label: 'Pilihan ganda' },
  { value: 'checkbox', label: 'Checkbox (bisa lebih dari satu)' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'rating', label: 'Rating 1-5' },
  { value: 'file', label: 'Upload file/gambar' },
  { value: 'address', label: 'Alamat pengiriman (provinsi, kota/kab., alamat, kode pos)' },
];
export const HAS_OPTIONS = ['choice', 'checkbox', 'dropdown'];
export const MAX_FILE = 3 * 1024 * 1024;

export function newId() {
  return 'q' + Math.random().toString(36).slice(2, 9);
}

export function defaultQuestions() {
  return [
    { id: newId(), type: 'short', label: 'Nama lengkap', required: true, options: [] },
    { id: newId(), type: 'short', label: 'Nomor WhatsApp', required: true, options: [] },
    { id: newId(), type: 'address', label: 'Alamat pengiriman', required: true, options: [] },
    { id: newId(), type: 'short', label: 'Username media sosial utama', required: false, options: [] },
  ];
}

// Bersihkan payload dari client sebelum disimpan.
export function sanitizeQuestions(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  return input.slice(0, 60).map((q) => {
    const type = TYPES.some((t) => t.value === q?.type) ? q.type : 'short';
    let id = typeof q?.id === 'string' && /^[a-z0-9]{2,20}$/i.test(q.id) ? q.id : newId();
    while (seen.has(id)) id = newId();
    seen.add(id);
    const options = HAS_OPTIONS.includes(type)
      ? (Array.isArray(q.options) ? q.options : [])
          .map((o) => String(o).trim().slice(0, 200))
          .filter(Boolean)
          .slice(0, 30)
      : [];
    return {
      id,
      type,
      label: String(q?.label || '').trim().slice(0, 300) || 'Pertanyaan tanpa judul',
      required: !!q?.required,
      options,
    };
  });
}
