// Turunan warna dari satu warna utama pilihan admin, supaya warna apa pun tetap terbaca.
export const HEX = /^#[0-9a-f]{6}$/i;

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (hex, other, t) => { const a = rgb(hex), b = rgb(other); return toHex(a.map((v, i) => v + (b[i] - v) * t)); };

function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

// Gelapkan sedikit demi sedikit sampai kontras terhadap putih mencapai target.
function darkenUntil(hex, target) {
  for (let t = 0; t <= 1; t += 0.04) { const c = mix(hex, '#000000', t); if (contrast(c, '#ffffff') >= target) return c; }
  return '#000000';
}

export function primaryVars(hex) {
  const base = HEX.test(hex || '') ? hex.toLowerCase() : '#5d87ff';
  return {
    '--primary': base,
    '--primary-hover': mix(base, '#000000', 0.12),
    '--primary-light': mix(base, '#ffffff', 0.88),
    '--primary-ring': mix(base, '#ffffff', 0.7),
    // teks/ikon di atas latar warna utama (tombol, menu aktif): putih selama kontrasnya >= 3:1
    // (teks tebal UI), selain itu gelap. Biru bawaan tetap berteks putih, pink/kuning muda berteks gelap.
    '--primary-ink': contrast(base, '#ffffff') >= 3 ? '#ffffff' : '#1b1f24',
    // teks berwarna di atas putih (link, tab aktif): minimal 4.5:1
    '--primary-text': darkenUntil(base, 4.5),
    // batang grafik di atas putih: minimal 3:1
    '--primary-chart': darkenUntil(base, 3),
  };
}
