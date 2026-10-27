import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import PageHeader from '@/components/PageHeader';

export const metadata = { title: 'Panduan admin' };

// Nama tombol/menu persis seperti di aplikasi, agar mudah dicari di layar.
const B = ({ children }) => <span className="ui">{children}</span>;

const SECTIONS = [
  ['peran', 'Siapa melakukan apa'],
  ['masuk', 'Masuk & memasang aplikasi'],
  ['brand', 'Menambah brand & tampilan form'],
  ['tim', 'Mengundang tim brand'],
  ['form', 'Membuat & mengelola form'],
  ['bagikan', 'Membagikan form ke affiliate'],
  ['hasil', 'Melihat hasil survey'],
  ['kirim', 'Mengelola pengiriman barang'],
  ['aplikasi', 'Mengatur tampilan aplikasi'],
  ['log', 'Log aktivitas & memulihkan data'],
  ['faq', 'Tips & pertanyaan umum'],
];

function Section({ id, title, children }) {
  return (
    <section id={id} className="panel guide">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default async function GuidePage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Panduan admin" subtitle="Cara memakai Gudcare Survey dari awal sampai pengiriman barang ke affiliate. Halaman ini hanya terlihat oleh admin." />

      <nav className="panel guide-toc" aria-label="Daftar isi">
        <h2>Daftar isi</h2>
        <ol>
          {SECTIONS.map(([id, title]) => <li key={id}><a href={`#${id}`}>{title}</a></li>)}
        </ol>
      </nav>

      <Section id="peran" title="1. Siapa melakukan apa">
        <dl className="roles">
          <div>
            <dt>Admin Gudcare (kamu)</dt>
            <dd>Melihat dan mengelola semua brand, semua form, semua hasil, dan semua pengiriman. Menambah brand dan mengundang tim brand.</dd>
          </div>
          <div>
            <dt>Tim brand</dt>
            <dd>Hanya melihat brand miliknya sendiri: form, jawaban, pengiriman, dan tampilan form brand tersebut. Tidak bisa melihat brand lain.</dd>
          </div>
          <div>
            <dt>Affiliate (pengisi form)</dt>
            <dd>Tidak perlu akun. Cukup membuka link form, mengisi, lalu mendapat link untuk melacak kiriman barang.</dd>
          </div>
        </dl>
      </Section>

      <Section id="masuk" title="2. Masuk & memasang aplikasi">
        <ol>
          <li>Buka halaman login, lalu klik <B>Masuk dengan Google</B> dan pilih akun Google admin. Bisa juga memakai email dan password.</li>
          <li>Kalau muncul pesan <em>“Email Google ini belum terdaftar”</em>, periksa email yang disebut di pesan itu. Biasanya akun Google yang dipilih bukan akun admin. Klik lagi dan pilih akun yang benar.</li>
          <li>Agar aplikasi bisa dibuka seperti aplikasi biasa di HP atau laptop, klik <B>Pasang aplikasi</B> di bagian atas dashboard (Chrome/Edge/Android). Di iPhone: tombol Share di Safari → <em>Add to Home Screen</em>.</li>
          <li>Untuk keluar, klik nama/avatar di kanan atas → <B>Keluar</B>.</li>
        </ol>
      </Section>

      <Section id="brand" title="3. Menambah brand & mengatur tampilan form">
        <ol>
          <li>Buka menu <B>Brand &amp; akun</B>. Semua brand tampil sebagai daftar berisi jumlah form, jawaban, dan akun. Klik <B>Tambah brand</B> di kanan atas, lalu isi nama brand dan pilih warna brand.</li>
          <li>Unggah logo (PNG/JPG/WEBP/SVG, maks. 300 KB). Logo tampil di header form sebagai <em>Gudcare × Brand</em>.</li>
          <li>Atur <strong>Tampilan form</strong>. Perubahan langsung terlihat di <em>Pratinjau halaman pengisi</em> di sebelah kanan:
            <ul>
              <li><B>Nuansa cepat</B>: satu klik mengatur font, latar, dan sudut sekaligus (<B>Segar</B>, <B>Ceria</B>, <B>Elegan</B>, <B>Malam</B>).</li>
              <li><B>Font</B>, <B>Latar</B>, dan <B>Sudut kartu &amp; tombol</B> bisa diatur satu per satu.</li>
              <li><B>Teks tombol kirim</B>, mis. “Daftar sekarang” sebagai ganti “Kirim”.</li>
              <li><B>Gambar sampul</B> (opsional, maks. 1 MB) tampil sebagai banner di atas form.</li>
            </ul>
          </li>
          <li>Klik <B>Tambah brand</B>; kamu langsung dibawa ke halaman detail brand tersebut. Untuk brand yang sudah ada, klik <B>Detail</B> di daftar brand, ubah isiannya, lalu klik <B>Simpan</B>.</li>
        </ol>
        <p className="note">Tampilan berlaku untuk <strong>semua form</strong> milik brand itu, termasuk halaman lacak kiriman.</p>
      </Section>

      <Section id="tim" title="4. Mengundang tim brand">
        <p>Cara yang disarankan adalah <strong>link undangan</strong>: tim brand cukup login dengan Google, tanpa kamu mengetik email mereka.</p>
        <ol>
          <li>Di <B>Brand &amp; akun</B>, klik <B>Detail</B> pada brand yang dimaksud, lalu lihat bagian <B>Undang tim brand</B>.</li>
          <li>Klik <B>Salin link</B> atau <B>Kirim via WhatsApp</B>, lalu kirim ke tim brand.</li>
          <li>Tim brand membuka link → <B>Masuk dengan Google untuk bergabung</B>. Akun mereka langsung dibuat dan masuk ke brand tersebut.</li>
          <li>Anggota yang sudah bergabung muncul di daftar <B>Akun login brand</B> dengan label <em>Google terhubung</em>.</li>
        </ol>
        <p>Kalau link terlanjur tersebar ke orang yang salah, klik <B>Buat link baru</B>. Link lama langsung tidak berlaku; akun yang sudah bergabung tidak terpengaruh.</p>
        <h3>Membuat akun secara manual</h3>
        <ol>
          <li>Di bagian <B>Akun login brand</B>, isi nama dan email. Password boleh dikosongkan bila orang tersebut hanya akan login dengan Google.</li>
          <li>Klik <B>Buat akun</B>.</li>
          <li>Untuk mengganti password akun brand, isi password baru di sebelah akunnya lalu klik <B>Ganti password</B>. Untuk mencabut akses, klik <B>Hapus</B>.</li>
        </ol>
      </Section>

      <Section id="form" title="5. Membuat & mengelola form">
        <ol>
          <li>Buka menu <B>Form</B>, pilih brand di samping tombol, lalu klik <B>Buat form baru</B>.</li>
          <li>Isi <B>Judul form</B>, <B>Deskripsi</B> (tampil di atas form), dan <B>Pesan setelah form dikirim</B>.</li>
          <li>Atur pertanyaan:
            <ul>
              <li>Tulis pertanyaan lalu pilih <B>Tipe</B>: Jawaban singkat, Paragraf, Pilihan ganda, Checkbox, Dropdown, Rating 1-5, atau Upload file/gambar (maks. 3 MB).</li>
              <li>Untuk pilihan ganda, checkbox, dan dropdown, tulis <B>Opsi</B> satu per baris.</li>
              <li>Centang <B>Wajib diisi</B> bila perlu. Gunakan <B>Naik</B>/<B>Turun</B> untuk mengubah urutan, <B>Hapus</B> untuk membuang pertanyaan, dan <B>Tambah pertanyaan</B> untuk menambah.</li>
            </ul>
          </li>
          <li>Klik <B>Simpan form</B>. Perubahan belum tersimpan sebelum tombol ini diklik.</li>
        </ol>
        <p className="note">
          <strong>Penting untuk pengiriman barang:</strong> nama pengisi diambil dari pertanyaan <em>Jawaban singkat</em> pertama dan nomor WhatsApp dari <em>Jawaban singkat</em> kedua.
          Biarkan urutan bawaan (<em>Nama lengkap</em>, lalu <em>Nomor WhatsApp</em>), dan tambahkan pertanyaan alamat (tipe <em>Paragraf</em>) bila barang akan dikirim.
        </p>
        <h3>Lainnya</h3>
        <ul>
          <li><strong>Menutup form:</strong> hilangkan centang <B>Form menerima jawaban</B> lalu <B>Simpan form</B>. Affiliate akan melihat pesan bahwa form sudah ditutup.</li>
          <li><strong>Memakai ulang form:</strong> klik <B>Salin</B> di daftar form, atau <B>Salin form</B> di halaman edit. Admin bisa memilih <B>Salin ke</B> brand lain. Jawaban tidak ikut tersalin.</li>
          <li><strong>Menghapus form:</strong> <B>Hapus form</B> di halaman edit. Semua jawabannya ikut terhapus dan tidak bisa dikembalikan.</li>
        </ul>
      </Section>

      <Section id="bagikan" title="6. Membagikan form ke affiliate">
        <ol>
          <li>Di halaman edit form, klik <B>Salin link</B> (link berbentuk <code>/f/kode</code>). <B>Buka</B> untuk melihat form seperti yang dilihat affiliate.</li>
          <li>Bagikan link lewat WhatsApp, Instagram, atau media lain. Affiliate tidak perlu login.</li>
          <li>Setelah mengirim form, affiliate mendapat tombol <B>Buka halaman lacak</B> untuk memantau kiriman barang dari brand.</li>
        </ol>
      </Section>

      <Section id="hasil" title="7. Melihat hasil survey">
        <ul>
          <li>Menu <B>Dashboard</B> (halaman pertama setelah login) merangkum semua form: jawaban masuk dibanding periode sebelumnya, jumlah affiliate unik, barang dikirim, konten tayang, grafik jawaban per hari, progres pengiriman, jawaban per brand dan per form, serta aktivitas terbaru. Pilih rentang waktu dan, untuk admin, filter brand di bagian atas.</li>
          <li>Halaman <B>Form</B> menampilkan total form, total jawaban, dan jawaban 7 hari terakhir dari semua brand.</li>
          <li>Tab <B>Ringkasan</B> pada sebuah form:
            <ul>
              <li>Pilih rentang <B>7 hari</B>, <B>30 hari</B>, <B>90 hari</B>, atau <B>Semua</B>.</li>
              <li>Angka utama: jumlah jawaban (dibanding periode sebelumnya), rata-rata per hari, dan waktu jawaban terakhir.</li>
              <li>Grafik jawaban per hari: arahkan kursor ke batang untuk melihat angkanya, atau buka <B>Lihat sebagai tabel</B>.</li>
              <li>Rekap per pertanyaan: jumlah dan persentase tiap pilihan, rata-rata rating, dan 5 jawaban teks terbaru.</li>
            </ul>
          </li>
          <li>Tab <B>Semua jawaban</B>: tabel semua jawaban, link file yang diunggah, dan kolom status pengiriman. Klik <B>Export CSV</B> untuk dibuka di Excel/Google Sheets. <B>Hapus</B> menghapus satu jawaban.</li>
        </ul>
        <p className="note">Waktu di aplikasi memakai UTC, yaitu 7 jam lebih awal dari WIB (mis. 09.00 UTC = 16.00 WIB).</p>
      </Section>

      <Section id="kirim" title="8. Mengelola pengiriman barang sponsor">
        <p>Setiap affiliate yang mengisi form otomatis tercatat di menu <B>Pengiriman</B> dengan status <em>Belum diproses</em>.</p>
        <ol>
          <li>Buka menu <B>Pengiriman</B> (semua form) atau tab <B>Pengiriman</B> di sebuah form.</li>
          <li>Gunakan kolom cari (nama, nomor WhatsApp, resi, atau barang) dan filter status untuk menemukan affiliate.</li>
          <li>Klik <B>Update</B>, lalu isi <B>Status</B>, <B>Barang yang dikirim</B>, <B>Kurir</B>, dan <B>No. resi</B>.</li>
          <li>Tulis <B>Catatan untuk riwayat</B> bila perlu. Centang <B>Tampilkan catatan ini ke pengisi</B> hanya untuk catatan yang boleh dibaca affiliate; tanpa centang, catatan hanya untuk internal.</li>
          <li>Klik <B>Simpan update</B>. Setiap perubahan tercatat di <B>Riwayat</B> beserta waktu dan nama yang mengubah.</li>
        </ol>
        <p>Urutan status: <em>Belum diproses → Dikemas → Dikirim → Diterima → Konten tayang</em>, plus <em>Gagal / dikembalikan</em>.</p>
        <h3>Link lacak untuk affiliate</h3>
        <ul>
          <li>Di halaman detail pengiriman, bagian <B>Link lacak untuk pengisi</B> berisi link yang bisa dibuka affiliate tanpa login. Klik <B>Kirim via WhatsApp</B> untuk langsung mengirimkannya ke nomor affiliate.</li>
          <li>Halaman lacak hanya menampilkan status, barang, kurir, no. resi, dan catatan yang dicentang. Alamat, jawaban lain, dan nama petugas tidak ditampilkan.</li>
          <li><B>Kiriman lain untuk orang ini</B> menampilkan kiriman ke orang yang sama dari form lain (dicocokkan dari nomor WhatsApp).</li>
        </ul>
      </Section>

      <Section id="aplikasi" title="9. Mengatur tampilan aplikasi">
        <p>Menu <B>Pengaturan aplikasi</B> (khusus admin) mengubah tampilan aplikasi untuk semua pengguna, termasuk tim brand dan halaman form affiliate.</p>
        <ol>
          <li>Ubah <B>Nama aplikasi</B>: tampil di sidebar, halaman login, judul tab browser, dan header form affiliate.</li>
          <li>Ubah <B>Teks di halaman login</B> bila perlu.</li>
          <li>Unggah <B>Logo</B> (PNG/JPG/SVG, maks. 300 KB). Logo ini juga menjadi ikon tab browser dan ikon aplikasi di HP. Centang/hilangkan <B>Tampilkan nama aplikasi di samping logo</B> sesuai bentuk logo; bila logo sudah berisi tulisan, hilangkan centangnya.</li>
          <li>Atur <B>Warna latar ikon aplikasi</B>: warna di sekitar logo pada ikon Android/iPhone yang berbentuk persegi atau bulat penuh.</li>
          <li>Pilih <B>Warna utama</B> untuk tombol, menu aktif, link, dan grafik. Warna teks di atasnya otomatis disesuaikan agar tetap terbaca.</li>
          <li>Lihat hasilnya di <em>Pratinjau</em>, lalu klik <B>Simpan pengaturan</B>. Semua pengguna langsung melihat tampilan baru.</li>
        </ol>
        <p>Untuk kembali ke tampilan awal, klik <B>Kembalikan ke bawaan</B>.</p>
        <p className="note">Tampilan form affiliate (font, latar, sampul) diatur per brand di <B>Brand &amp; akun</B>, bukan di sini. Di HP yang sudah memasang aplikasi, ikon baru kadang baru terlihat setelah aplikasi dibuka ulang atau dipasang ulang.</p>
      </Section>

      <Section id="log" title="10. Log aktivitas & memulihkan data">
        <p>Menu <B>Log aktivitas</B> (khusus admin) mencatat siapa melakukan apa dan kapan: login (termasuk yang gagal), membuat/mengubah/menyalin/menghapus form, menghapus jawaban, perubahan brand, akun, link undangan, pengiriman, dan pengaturan aplikasi.</p>
        <ul>
          <li>Saring dengan jenis aktivitas (<B>Hapus</B>, <B>Buat</B>, <B>Ubah</B>, <B>Pulihkan</B>, <B>Login</B>), brand, atau kata kunci (nama form, email, nama pengguna).</li>
          <li>Klik <B>Lihat perubahan</B> untuk melihat isi yang berubah, mis. judul lama → baru atau pertanyaan yang dihapus.</li>
          <li><strong>Form atau jawaban terhapus tidak hilang permanen.</strong> Cari baris <em>Form dihapus</em> / <em>Jawaban dihapus</em>, lalu klik <B>Pulihkan</B>. Jawaban, file, dan riwayat pengirimannya ikut kembali.</li>
          <li>Kalau pertanyaan form terhapus atau berubah tidak sengaja, cari baris <em>Form diubah</em> lalu klik <B>Kembalikan</B> untuk mengembalikan isi form ke sebelum perubahan itu. Jawaban yang sudah masuk tidak terpengaruh.</li>
          <li>Akun yang dihapus tidak bisa dipulihkan dari log; undang ulang orangnya lewat link undangan brand.</li>
        </ul>
      </Section>

      <Section id="faq" title="11. Tips & pertanyaan umum">
        <dl className="faq">
          <div>
            <dt>Tim brand bilang tidak bisa login.</dt>
            <dd>Pastikan mereka membuka <strong>link undangan</strong> brand-nya, bukan halaman login biasa, dan memakai akun Google yang benar. Pesan error menyebut email Google yang dipakai.</dd>
          </div>
          <div>
            <dt>Link undangan tersebar ke orang yang salah.</dt>
            <dd>Klik <B>Buat link baru</B> di brand tersebut, lalu hapus akun yang tidak seharusnya di <B>Akun login brand</B>.</dd>
          </div>
          <div>
            <dt>Ada yang tidak sengaja menghapus form atau jawaban.</dt>
            <dd>Buka <B>Log aktivitas</B>, pilih jenis <B>Hapus</B>, temukan barisnya, lalu klik <B>Pulihkan</B>. Log juga menunjukkan siapa yang menghapus dan kapan.</dd>
          </div>
          <div>
            <dt>Affiliate gagal mengirim form dengan file.</dt>
            <dd>Ukuran maksimal 3 MB per file. Minta affiliate mengecilkan foto atau mengirim screenshot.</dd>
          </div>
          <div>
            <dt>Affiliate kehilangan link lacak.</dt>
            <dd>Buka <B>Pengiriman</B>, cari nama atau nomornya, buka detail, lalu kirim ulang lewat <B>Kirim via WhatsApp</B>.</dd>
          </div>
          <div>
            <dt>Ingin mengganti email/password admin atau menambah admin lain.</dt>
            <dd>Belum tersedia di aplikasi. Hubungi pengelola teknis aplikasi.</dd>
          </div>
          <div>
            <dt>Data aman?</dt>
            <dd>Tim brand hanya bisa melihat data brand-nya sendiri. Jangan bagikan akun admin; undang orang lewat link undangan brand agar aksesnya terbatas.</dd>
          </div>
        </dl>
        <p style={{ margin: 0 }}><Link href="#peran">Kembali ke atas</Link></p>
      </Section>
    </>
  );
}
