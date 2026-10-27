/** @type {import('next').NextConfig} */
module.exports = {
  // Dimuat dari node_modules (bukan dibundel) agar file font/data bawaannya ikut terbawa ke server Vercel.
  serverExternalPackages: ['pdfkit', 'exceljs'],
  // pdfkit membaca file font (.afm) lewat path dinamis yang tidak terdeteksi otomatis; ikutkan semuanya.
  outputFileTracingIncludes: { '/api/export/[id]': ['./node_modules/pdfkit/js/data/**'] },
  // Vercel membatasi body request 4,5 MB; batas ini memberi error yang jelas lebih dulu.
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  // sw.js tidak boleh di-cache browser, supaya versi service worker baru langsung terpasang.
  async headers() {
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] }];
  },
};
