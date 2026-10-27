'use client';

// Centang/hapus centang semua checkbox bernama `name` di form yang sama.
export default function SelectAll({ name, label = 'Pilih semua' }) {
  return (
    <label className="opt" style={{ margin: 0 }}>
      <input
        type="checkbox"
        aria-label={label}
        onChange={(e) => e.target.closest('form').querySelectorAll(`input[name="${name}"]`).forEach((c) => { c.checked = e.target.checked; })}
      />
    </label>
  );
}
