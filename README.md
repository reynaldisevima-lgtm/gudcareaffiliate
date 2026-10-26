# Gudcare Survey Affiliate

Aplikasi form survey untuk affiliate. Satu aplikasi dipakai banyak brand Gudcare; tiap brand punya akun login, form, tampilan form, hasil, dan pelacakan pengiriman barang sendiri.

Stack: Next.js (App Router) di Vercel, database PostgreSQL di Supabase.

## Menjalankan di lokal

```bash
npm install
cp .env.example .env.local   # isi DATABASE_URL, SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run dev                  # http://localhost:3000
```

Tabel dibuat otomatis saat aplikasi pertama kali terhubung ke database, beserta satu akun admin dari
`ADMIN_EMAIL` / `ADMIN_PASSWORD` (bawaan `admin@gudcare.local` / `gudcare123`, **ganti sebelum dipakai sungguhan**).

## Deploy ke Vercel + Supabase

1. **Supabase**: buat project (region **Southeast Asia (Singapore)**, sama dengan region Vercel di `vercel.json`).
   Ambil connection string di *Connect > Connection string > Transaction pooler* (port `6543`) dan ganti `[YOUR-PASSWORD]`.
2. **GitHub**: buat repo kosong lalu push branch `main`.
3. **Vercel**: *Add New > Project*, impor repo tersebut, lalu isi Environment Variables:

   | Variabel | Isi |
   |---|---|
   | `DATABASE_URL` | connection string Transaction pooler Supabase |
   | `SESSION_SECRET` | string acak min. 32 karakter (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
   | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | akun admin pertama (dibuat hanya jika belum ada admin) |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | untuk login Google (lihat di bawah) |
   | `APP_URL` | opsional, domain utama, mis. `https://survey.gudcare.id` |

4. Deploy. Setiap push ke `main` otomatis di-deploy ulang; branch lain mendapat preview URL.

### Pindahkan data dari versi SQLite lama

Jika masih punya `data/app.db` dari versi sebelumnya, jalankan sekali sebelum aplikasi dipakai:

```bash
npm i --no-save better-sqlite3
node --env-file=.env.local scripts/migrate-from-sqlite.mjs            # database tujuan harus kosong
node --env-file=.env.local scripts/migrate-from-sqlite.mjs --replace  # timpa isi database tujuan
```

## Login Google (dashboard)

Admin dan user brand bisa masuk dengan Google; login email + password tetap tersedia sebagai cadangan.
Hanya email yang sudah didaftarkan admin di **Brand & akun** yang bisa masuk. Pada login Google pertama,
akun Google tersebut dikunci ke user itu. Akun brand bisa dibuat tanpa password (khusus login Google).

Membuat kredensial: Google Cloud Console > *APIs & Services* > *OAuth consent screen* (isi nama aplikasi, tipe External),
lalu *Credentials > Create credentials > OAuth client ID* (tipe **Web application**) dengan *Authorized redirect URIs*:

- `https://<domain-vercel-kamu>/api/auth/google/callback`
- `http://localhost:3000/api/auth/google/callback` (untuk lokal)

Preview deployment Vercel memakai domain berbeda; tambahkan redirect URI-nya juga bila ingin login Google di preview.

## Alur

1. Admin login, buka **Brand & akun**, tambah brand (nama, warna, logo, tampilan form) lalu buat akun login brand.
2. User brand buka **Form**, klik **Buat form baru** (atau **Salin** form yang ada), atur pertanyaan, lalu simpan.
3. Bagikan link form (`/f/<kode>`) ke affiliate. Affiliate tidak perlu login.
4. Hasil: tab **Ringkasan** (grafik dan rekap per pertanyaan), **Semua jawaban**, dan export CSV.
5. Barang sponsor: tab/menu **Pengiriman** untuk mencatat barang, kurir, resi, dan status. Pengisi mendapat link
   lacak `/lacak/<token>` setelah mengirim form; admin juga bisa mengirim link itu lewat WhatsApp.

## Hak akses

- Admin Gudcare: semua brand, semua form, kelola brand dan akun.
- User brand: hanya form, jawaban, file, pengiriman, dan pengaturan brand miliknya.

## Tipe pertanyaan

Jawaban singkat, paragraf, pilihan ganda, checkbox, dropdown, rating 1-5, upload file (maks. 3 MB).
Nama pengisi di menu Pengiriman diambil dari jawaban singkat pertama, nomor WhatsApp dari jawaban singkat kedua.

## Catatan

- Wajib isi `SESSION_SECRET` di production. Cookie login hanya dikirim lewat HTTPS di production
  (set `COOKIE_SECURE=false` hanya jika diakses lewat HTTP biasa).
- Vercel membatasi ukuran satu request 4,5 MB; satu kiriman form dengan beberapa file besar bisa ditolak.
- File upload, logo, dan sampul disimpan di database. Aktifkan backup di Supabase (paket berbayar punya backup harian).
- RLS diaktifkan di semua tabel agar tidak bisa diakses lewat REST API publik Supabase; aplikasi terhubung langsung ke Postgres.
- Identitas Gudcare (nama di header halaman pengisi) diatur di `lib/config.js`.
- Belum ada pembatasan percobaan login password; letakkan di balik WAF bila perlu.
