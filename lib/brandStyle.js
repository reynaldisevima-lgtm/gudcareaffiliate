// Personalisasi tampilan halaman pengisi per brand. Dipakai di server (simpan) dan client (pratinjau).

export const FONTS = [
  { value: 'jakarta', label: 'Plus Jakarta Sans (bawaan)' },
  { value: 'poppins', label: 'Poppins (modern)' },
  { value: 'nunito', label: 'Nunito (bulat, ramah)' },
  { value: 'lora', label: 'Lora (serif, elegan)' },
];

export const BACKGROUNDS = [
  { value: 'plain', label: 'Abu-abu lembut' },
  { value: 'tint', label: 'Warna brand tipis' },
  { value: 'gradient', label: 'Gradasi warna brand' },
  { value: 'dark', label: 'Gelap' },
];

export const CORNERS = [
  { value: 'rounded', label: 'Bulat' },
  { value: 'soft', label: 'Sedang' },
  { value: 'sharp', label: 'Tegas' },
];

export const PRESETS = [
  { label: 'Segar', style: { font: 'jakarta', background: 'tint', corners: 'rounded' } },
  { label: 'Ceria', style: { font: 'nunito', background: 'gradient', corners: 'rounded' } },
  { label: 'Elegan', style: { font: 'lora', background: 'plain', corners: 'sharp' } },
  { label: 'Malam', style: { font: 'poppins', background: 'dark', corners: 'soft' } },
];

export const DEFAULT_STYLE = { font: 'jakarta', background: 'plain', corners: 'rounded', button_label: 'Kirim' };

const pick = (list, v, d) => (list.some((x) => x.value === v) ? v : d);

export function sanitizeStyle(input) {
  const s = input && typeof input === 'object' ? input : {};
  return {
    font: pick(FONTS, s.font, DEFAULT_STYLE.font),
    background: pick(BACKGROUNDS, s.background, DEFAULT_STYLE.background),
    corners: pick(CORNERS, s.corners, DEFAULT_STYLE.corners),
    button_label: String(s.button_label || '').trim().slice(0, 30) || DEFAULT_STYLE.button_label,
  };
}

export function parseStyle(json) {
  try {
    return sanitizeStyle(JSON.parse(json || '{}'));
  } catch {
    return { ...DEFAULT_STYLE };
  }
}

// Warna teks yang terbaca di atas warna brand (tombol), putih atau gelap.
export function textOn(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const lin = (i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
  return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.05) ? '#ffffff' : '#1b1f24';
}
