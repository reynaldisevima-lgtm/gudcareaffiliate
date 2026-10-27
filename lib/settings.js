import crypto from 'crypto';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { COMPANY } from '@/lib/config';

// Workspace pemilik platform (data awal Gudcare). Tampilan halaman tanpa login (login, daftar) memakai pengaturannya.
export const PLATFORM_WORKSPACE = 1;

// Personalisasi aplikasi per workspace (tabel app_settings, key/value). Nilai kosong memakai bawaan di bawah.
export const DEFAULT_SETTINGS = {
  app_name: COMPANY.name,
  tagline: 'Masuk untuk mengelola form survey affiliate brand kamu.',
  logo: null,
  show_name: '1', // '0' = hanya gambar logo, tanpa nama di sampingnya
  primary: '#5d87ff',
  icon_bg: '#ffffff', // latar ikon persegi (Android/iPhone) yang dibuat dari logo
};

// Workspace user yang sedang login, atau workspace platform bila belum login.
export async function currentWorkspaceId() {
  return (await getUser())?.workspace_id || PLATFORM_WORKSPACE;
}

const load = cache(async (ws) => {
  const s = { ...DEFAULT_SETTINGS, workspace_id: ws };
  try {
    for (const r of await db.all('SELECT key, value FROM app_settings WHERE workspace_id=?', ws)) if (r.key in DEFAULT_SETTINGS && r.value) s[r.key] = r.value;
  } catch (e) {
    console.error('Gagal membaca pengaturan aplikasi:', e.message);
  }
  const v = s.logo && crypto.createHash('sha1').update(s.logo + s.icon_bg).digest('hex').slice(0, 10);
  // ?w= agar halaman publik (tanpa login) tetap mengambil logo workspace yang benar.
  s.logo_url = s.logo ? `/api/app-logo?w=${ws}&v=${v}` : null;
  s.icons = appIcons(ws, s.logo ? v : null);
  return s;
});

// Dibaca sekali per request. Tanpa argumen: workspace user yang login (atau platform).
// Bila database tidak bisa dihubungi (mis. saat build), pakai bawaan.
export async function getSettings(workspaceId) {
  return load(Number(workspaceId) || (await currentWorkspaceId()));
}

// Favicon & ikon PWA: dibuat dari logo admin (/api/app-icon) bila ada, selain itu ikon Gudcare bawaan.
function appIcons(ws, v) {
  const gen = (size, mask) => `/api/app-icon?w=${ws}&size=${size}${mask ? '&mask=1' : ''}&v=${v}`;
  return v
    ? { favicon: gen(64), apple: gen(180, true), any192: gen(192), any512: gen(512), maskable512: gen(512, true) }
    : { favicon: '/icons/favicon-64.png', apple: '/icons/apple-180.png', any192: '/icons/icon-192.png', any512: '/icons/icon-512.png', maskable512: '/icons/maskable-512.png' };
}

// Data yang aman dikirim ke komponen client (tanpa data gambar mentah).
export const publicApp = (s) => ({ app_name: s.app_name, logo_url: s.logo_url, show_name: s.show_name });
