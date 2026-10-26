/** @type {import('next').NextConfig} */
module.exports = {
  // Vercel membatasi body request 4,5 MB; batas ini memberi error yang jelas lebih dulu.
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  // sw.js tidak boleh di-cache browser, supaya versi service worker baru langsung terpasang.
  async headers() {
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] }];
  },
};
