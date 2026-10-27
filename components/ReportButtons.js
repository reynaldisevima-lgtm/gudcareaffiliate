// Pilihan unduh laporan: Excel (tabel data) atau PDF (laporan rinci). range mengikuti filter halaman bila ada.
export default function ReportButtons({ formId, range = 'all' }) {
  const href = (format) => `/api/export/${formId}?format=${format}&range=${range}`;
  return (
    <div className="row" style={{ gap: 8 }}>
      <a className="btn" href={href('xlsx')} title="Tabel data semua jawaban, alamat per kolom, status & resi">Unduh Excel</a>
      <a className="btn primary" href={href('pdf')} title="Laporan rinci: angka utama, rekap per pertanyaan, daftar penerima">Unduh PDF</a>
    </div>
  );
}
