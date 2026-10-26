'use client';
import { useEffect, useState } from 'react';

// Daftarkan service worker sekali di root layout.
export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const url = process.env.NODE_ENV === 'production' ? '/sw.js' : '/sw.js?dev=1';
    navigator.serviceWorker.register(url, { scope: '/' }).catch(() => {});
  }, []);
  return null;
}

// Tombol "Pasang aplikasi": muncul hanya bila browser menawarkan instalasi (Chrome/Edge/Android)
// dan app belum dibuka sebagai aplikasi terpasang.
export function InstallButton() {
  const [prompt, setPrompt] = useState(null);
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); };
    const onInstalled = () => setPrompt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  if (!prompt) return null;
  return (
    <button
      type="button"
      className="small"
      onClick={async () => {
        prompt.prompt();
        await prompt.userChoice;
        setPrompt(null);
      }}
    >
      Pasang aplikasi
    </button>
  );
}
