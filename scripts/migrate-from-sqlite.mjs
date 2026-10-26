// Pindahkan data dari database SQLite lama (data/app.db) ke PostgreSQL di DATABASE_URL (Supabase).
// Jalankan sekali dari komputer yang punya data/app.db:
//   npm i --no-save better-sqlite3
//   node --env-file=.env.local scripts/migrate-from-sqlite.mjs            (database tujuan harus kosong)
//   node --env-file=.env.local scripts/migrate-from-sqlite.mjs --replace  (hapus isi tujuan dulu)
import { createRequire } from 'module';
import path from 'path';
import postgres from 'postgres';
import { SCHEMA } from '../lib/schema.js';

const require = createRequire(import.meta.url);
let Database;
try {
  Database = require('better-sqlite3');
} catch {
  console.error('better-sqlite3 belum terpasang. Jalankan dulu: npm i --no-save better-sqlite3');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL belum diisi di .env.local');
  process.exit(1);
}

// Urutan mengikuti foreign key.
const TABLES = ['brands', 'users', 'forms', 'responses', 'files', 'shipments', 'shipment_events'];
const replace = process.argv.includes('--replace');
const src = new Database(path.resolve(process.argv.find((a) => a.endsWith('.db')) || 'data/app.db'), { readonly: true, fileMustExist: true });
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });

try {
  await sql.unsafe(SCHEMA);
  const srcTables = new Set(src.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t) => t.name));

  const filled = [];
  for (const t of TABLES) if ((await sql.unsafe(`SELECT 1 FROM ${t} LIMIT 1`)).length) filled.push(t);
  if (filled.length && !replace) {
    console.error(`Database tujuan sudah berisi data (${filled.join(', ')}).`);
    console.error('Tambahkan --replace untuk menghapus isinya dan menimpa dengan data dari SQLite.');
    process.exitCode = 1;
  } else {
    await sql.begin(async (t) => {
      if (replace) await t.unsafe(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
      for (const table of TABLES) {
        if (!srcTables.has(table)) continue;
        const pgCols = (await t`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=${table}`).map((c) => c.column_name);
        const cols = src.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name).filter((c) => pgCols.includes(c));
        const rows = src.prepare(`SELECT ${cols.join(',')} FROM ${table} ORDER BY id`).all();
        for (let i = 0; i < rows.length; i += 200) await t`INSERT INTO ${t(table)} ${t(rows.slice(i, i + 200), cols)}`;
        // Lanjutkan penomoran id setelah id terbesar yang disalin.
        await t.unsafe(`SELECT setval(pg_get_serial_sequence('${table}','id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM ${table}`);
        console.log(`${table}: ${rows.length} baris`);
      }
    });
    console.log('Selesai.');
  }
} finally {
  await sql.end();
  src.close();
}
