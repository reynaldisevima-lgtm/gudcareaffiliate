# Gudcare Survey Affiliate

Aplikasi form survey untuk affiliate. Satu aplikasi dipakai banyak brand Gudcare; tiap brand punya akun login, form, dan hasil sendiri.

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run build
npm start                    # http://localhost:3000
```

Untuk pengembangan: `npm run dev`.

Saat pertama dijalankan, database SQLite dibuat otomatis di `data/app.db` beserta satu akun admin
(dari `ADMIN_EMAIL` / `ADMIN_PASSWORD`; bawaan: `admin@gudcare.local` / `gudcare123`, **ganti sebelum dipakai sungguhan**).

## Alur

1. Admin login, buka **Brand & akun**, tambah brand (nama, warna, logo) lalu buat akun login untuk brand tersebut.
2. User brand login, buka **Form**, klik **Buat form baru**, atur pertanyaan, lalu simpan.
3. Salin link form (`/f/<kode>`) dan bagikan ke affiliate. Affiliate tidak perlu login.
4. Halaman pengisi menampilkan identitas **Gudcare × Brand** (logo dan warna brand).
5. Jawaban masuk ke **Lihat jawaban**; bisa di-export ke CSV.

## Hak akses

- Admin Gudcare: semua brand, semua form, kelola brand dan akun.
- User brand: hanya form, jawaban, file, dan pengaturan brand miliknya.

## Tipe pertanyaan

Jawaban singkat, paragraf, pilihan ganda, checkbox, dropdown, rating 1-5, upload file (maks. 3 MB).

## Catatan deployment

- Wajib isi `SESSION_SECRET` (min. 32 karakter acak) di production.
- Cookie login hanya dikirim lewat HTTPS di production. Jika diakses lewat HTTP biasa, set `COOKIE_SECURE=false`.
- Data tersimpan di folder `data/` (SQLite + file upload di dalam DB). Backup folder ini secara berkala dan pastikan folder persisten di hosting (mis. volume), bukan filesystem sementara.
- Identitas Gudcare (nama di header halaman pengisi) diatur di `lib/config.js`.
- Belum ada pembatasan percobaan login; letakkan di balik reverse proxy/WAF bila dibuka ke publik.
