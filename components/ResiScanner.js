'use client';
import { useEffect, useRef, useState } from 'react';

// Format barcode yang lazim di label resi kurir Indonesia (kebanyakan Code 128), plus QR.
const NATIVE_FORMATS = ['code_128', 'code_39', 'code_93', 'codabar', 'itf', 'ean_13', 'ean_8', 'qr_code', 'data_matrix', 'pdf417'];

async function nativeDetector() {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null;
  try {
    const supported = await window.BarcodeDetector.getSupportedFormats();
    const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
    return formats.length ? new window.BarcodeDetector({ formats }) : null;
  } catch {
    return null;
  }
}

// ZXing hanya diunduh saat dibutuhkan (browser tanpa BarcodeDetector, mis. Safari iPhone & Chrome Windows).
async function zxingReader() {
  const { BrowserMultiFormatReader } = await import('@zxing/browser');
  return new BrowserMultiFormatReader();
}

function cameraError(e) {
  if (e?.name === 'NotAllowedError') return 'Izin kamera ditolak. Izinkan kamera untuk situs ini di pengaturan browser, atau pakai Ambil foto label.';
  if (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError') return 'Kamera tidak ditemukan di perangkat ini. Pakai Ambil foto label.';
  if (typeof window !== 'undefined' && !window.isSecureContext) return 'Kamera hanya bisa dipakai lewat HTTPS.';
  return 'Kamera tidak bisa dibuka. Pakai Ambil foto label.';
}

// Tombol "Scan resi" + "Ambil foto label". onResult(teks) dipanggil sekali saat barcode terbaca.
export default function ResiScanner({ onResult }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef(null);
  const stopRef = useRef(() => {});
  const fileRef = useRef(null);

  const finish = (text) => {
    stopRef.current();
    setOpen(false);
    navigator.vibrate?.(80);
    onResult(text);
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setMsg(null);
      try {
        const native = await nativeDetector();
        if (native) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
          if (cancelled) return stream.getTracks().forEach((t) => t.stop());
          const video = videoRef.current;
          video.srcObject = stream;
          await video.play();
          let raf = 0;
          const tick = async () => {
            try {
              const [code] = await native.detect(video);
              if (code?.rawValue) return finish(code.rawValue);
            } catch {}
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          stopRef.current = () => { cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); };
        } else {
          const reader = await zxingReader();
          if (cancelled) return;
          const controls = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: 'environment' } }, audio: false },
            videoRef.current,
            (result) => { if (result) finish(result.getText()); }
          );
          stopRef.current = () => controls.stop();
          if (cancelled) controls.stop();
        }
      } catch (e) {
        if (!cancelled) setMsg(cameraError(e));
      }
    })();
    return () => { cancelled = true; stopRef.current(); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function readPhoto(file) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    const url = URL.createObjectURL(file);
    try {
      const native = await nativeDetector();
      if (native) {
        const [code] = await native.detect(await createImageBitmap(file));
        if (code?.rawValue) return finish(code.rawValue);
      } else {
        const reader = await zxingReader();
        const result = await reader.decodeFromImageUrl(url);
        if (result) return finish(result.getText());
      }
      setMsg('Barcode tidak terbaca di foto. Foto lebih dekat, terang, dan tidak miring, atau ketik no. resi manual.');
    } catch {
      setMsg('Barcode tidak terbaca di foto. Foto lebih dekat, terang, dan tidak miring, atau ketik no. resi manual.');
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="resi-scan">
      <div className="row" style={{ gap: 8 }}>
        <button type="button" onClick={() => setOpen(true)}>Scan resi</button>
        <label className="btn" style={{ margin: 0, fontWeight: 600 }}>
          {busy ? 'Membaca foto...' : 'Ambil foto label'}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => readPhoto(e.target.files?.[0])} />
        </label>
      </div>
      {msg && !open && <p className="error" role="alert" style={{ margin: '8px 0 0' }}>{msg}</p>}

      {open && (
        <div className="scan-overlay" role="dialog" aria-modal="true" aria-label="Scan barcode resi">
          <div className="scan-box">
            <div className="scan-video">
              <video ref={videoRef} muted playsInline />
              <span className="scan-guide" aria-hidden="true" />
            </div>
            <p style={{ margin: '12px 0 0' }}>{msg || 'Arahkan kamera ke barcode resi di label paket.'}</p>
            <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { stopRef.current(); setOpen(false); }}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
