import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { SCHEMA } from '@/lib/schema';

export const newTrackToken = () => crypto.randomBytes(12).toString('base64url');

// Satu pool koneksi per instance server. Di Vercel pakai connection string "Transaction pooler"
// Supabase (port 6543); prepare:false wajib untuk pooler mode transaksi.
function connect() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum diisi (lihat .env.example)');
  return postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: Number(process.env.DB_POOL_MAX || 5),
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
  });
}

const sql = globalThis.__gudcareSql ?? (globalThis.__gudcareSql = connect());

// Skema dibuat otomatis sekali per instance. Advisory lock mencegah dua instance membuatnya bersamaan.
async function init() {
  await sql.begin(async (t) => {
    await t`SELECT pg_advisory_xact_lock(724001)`;
    await t.unsafe(SCHEMA);
    const [admin] = await t`SELECT 1 FROM users WHERE role='admin' LIMIT 1`;
    if (!admin) {
      const email = (process.env.ADMIN_EMAIL || 'admin@gudcare.local').toLowerCase();
      const pass = process.env.ADMIN_PASSWORD || 'gudcare123';
      await t`INSERT INTO users (email,name,password_hash,role) VALUES (${email}, 'Admin Gudcare', ${bcrypt.hashSync(pass, 10)}, 'admin')`;
    }
  });
}
const ready = () => (globalThis.__gudcareReady ??= init().catch((e) => { globalThis.__gudcareReady = null; throw e; }));

// Query ditulis dengan placeholder '?' (seperti versi SQLite) lalu diubah ke $1, $2, ...
// Jangan memakai '?' di dalam literal string SQL.
const bind = (text) => { let i = 0; return text.replace(/\?/g, () => '$' + ++i); };
// SQLite mengembalikan "tidak ada baris" untuk id NaN/terlalu besar (mis. /dashboard/forms/abc);
// Postgres melempar error. Samakan perilakunya: angka yang bukan integer 32-bit menjadi NULL.
const clean = (args) => args.map((v) => (typeof v === 'number' && !(Number.isInteger(v) && Math.abs(v) <= 2147483647) ? null : v));

function api(run) {
  return {
    all: (text, ...args) => run(bind(text), clean(args)),
    get: async (text, ...args) => (await run(bind(text), clean(args)))[0],
    run: async (text, ...args) => ({ changes: (await run(bind(text), clean(args))).count }),
  };
}

export const db = {
  ...api(async (text, args) => { await ready(); return sql.unsafe(text, args); }),
  // Transaksi: semua query di dalam fn memakai koneksi yang sama dan di-commit bersamaan.
  tx: async (fn) => { await ready(); return sql.begin((t) => fn(api((text, args) => t.unsafe(text, args)))); },
};
