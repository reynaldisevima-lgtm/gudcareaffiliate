// Waktu SQLite (UTC) -> "23 Okt 2026, 09.20 UTC".
export function fmtUtc(s) {
  return (
    new Date(s.replace(' ', 'T') + 'Z').toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
    }) + ' UTC'
  );
}

// Ubah satu jawaban menjadi teks (untuk tabel dan CSV).
export function answerText(a) {
  if (a === undefined || a === null) return '';
  if (Array.isArray(a)) return a.join(', ');
  if (typeof a === 'object') return a.name || 'file';
  return String(a);
}
