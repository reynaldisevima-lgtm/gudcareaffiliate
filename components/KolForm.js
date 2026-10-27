'use client';
import { useActionState, useState } from 'react';
import { saveKol } from '@/app/actions';
import { PROVINCES } from '@/lib/address';
import { PLATFORMS, BANKS } from '@/lib/kol';

const emptySocial = () => ({ platform: 'Instagram', username: '', followers: '' });

// Form tambah/ubah KOL. Saat mengubah, NPWP & no. rekening dibiarkan kosong = tidak diubah,
// sehingga nilai lengkapnya tidak pernah tampil di form.
export default function KolForm({ kol, brands, hasNpwp, hasAccount }) {
  const [state, action, pending] = useActionState(saveKol, null);
  const [socials, setSocials] = useState(kol?.socials?.length ? kol.socials.map((s) => ({ ...s, followers: s.followers ?? '' })) : [emptySocial()]);
  const editing = !!kol;
  const a = kol?.address || {};
  const setRow = (i, patch) => setSocials((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <form action={action} className="stack">
      {editing && <input type="hidden" name="id" value={kol.id} />}
      {brands && (
        <div>
          <label htmlFor="brand_id">Brand</label>
          <select id="brand_id" name="brand_id" required defaultValue="">
            <option value="" disabled>Pilih brand</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      <h3 className="sub" style={{ marginTop: 8 }}>Identitas & kontak</h3>
      <div className="row">
        <div className="grow"><label htmlFor="name">Nama lengkap</label><input id="name" name="name" type="text" required maxLength={100} defaultValue={kol?.name} /></div>
        <div className="grow"><label htmlFor="phone">No. HP / WhatsApp</label><input id="phone" name="phone" type="text" inputMode="tel" required maxLength={25} defaultValue={kol?.phone} /></div>
        <div className="grow"><label htmlFor="email">Email (opsional)</label><input id="email" name="email" type="email" maxLength={120} defaultValue={kol?.email} /></div>
      </div>

      <h3 className="sub">Alamat pengiriman</h3>
      <div className="address-fields">
        <div>
          <label className="sub-label" htmlFor="addr_province">Provinsi</label>
          <select id="addr_province" name="addr_province" required defaultValue={a.province || ''}>
            <option value="" disabled>Pilih provinsi</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div><label className="sub-label" htmlFor="addr_city">Kota/Kabupaten</label><input id="addr_city" name="addr_city" type="text" required maxLength={100} defaultValue={a.city} /></div>
        <div className="span-2"><label className="sub-label" htmlFor="addr_street">Alamat lengkap</label><textarea id="addr_street" name="addr_street" required maxLength={500} defaultValue={a.street} placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan, patokan" style={{ minHeight: 72 }} /></div>
        <div><label className="sub-label" htmlFor="addr_postal">Kode pos</label><input id="addr_postal" name="addr_postal" type="text" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required defaultValue={a.postal} placeholder="5 angka" /></div>
      </div>

      <h3 className="sub">Sosial media</h3>
      <div className="social-rows">
        {socials.map((s, i) => (
          <div className="row social-row" key={i}>
            <select name="social_platform" value={s.platform} onChange={(e) => setRow(i, { platform: e.target.value })} aria-label={`Platform ${i + 1}`} style={{ width: 'auto', minWidth: 150 }}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input name="social_username" type="text" value={s.username} onChange={(e) => setRow(i, { username: e.target.value })} placeholder="username (tanpa @)" aria-label={`Username ${i + 1}`} maxLength={80} className="grow" required={i === 0} />
            <input name="social_followers" type="text" inputMode="numeric" value={s.followers} onChange={(e) => setRow(i, { followers: e.target.value.replace(/\D/g, '') })} placeholder="followers" aria-label={`Followers ${i + 1}`} style={{ width: 130 }} />
            {socials.length > 1 && <button type="button" className="small danger" onClick={() => setSocials((rows) => rows.filter((_, j) => j !== i))}>Hapus</button>}
          </div>
        ))}
        {socials.length < 10 && <button type="button" className="small" onClick={() => setSocials((rows) => [...rows, emptySocial()])}>+ Tambah akun sosial media</button>}
      </div>

      <h3 className="sub">Pajak & rekening</h3>
      {editing && <p className="muted" style={{ margin: 0 }}>Kosongkan NPWP atau no. rekening bila tidak ingin mengubahnya.</p>}
      <div className="row">
        <div className="grow">
          <label htmlFor="npwp">NPWP (15 atau 16 angka)</label>
          <input id="npwp" name="npwp" type="text" inputMode="numeric" maxLength={25} autoComplete="off" placeholder={editing && hasNpwp ? 'Sudah tersimpan, isi untuk mengganti' : 'mis. 12.345.678.9-012.345'} />
        </div>
      </div>
      <div className="row">
        <div className="grow">
          <label htmlFor="bank_name">Bank</label>
          <input id="bank_name" name="bank_name" type="text" list="banks" maxLength={60} defaultValue={kol?.bank_name} placeholder="mis. BCA" />
          <datalist id="banks">{BANKS.map((b) => <option key={b} value={b} />)}</datalist>
        </div>
        <div className="grow">
          <label htmlFor="bank_account">No. rekening</label>
          <input id="bank_account" name="bank_account" type="text" inputMode="numeric" maxLength={25} autoComplete="off" placeholder={editing && hasAccount ? 'Sudah tersimpan, isi untuk mengganti' : 'hanya angka'} />
        </div>
        <div className="grow"><label htmlFor="bank_holder">Atas nama</label><input id="bank_holder" name="bank_holder" type="text" maxLength={100} defaultValue={kol?.bank_holder} /></div>
      </div>

      <div><label htmlFor="notes">Catatan (opsional)</label><textarea id="notes" name="notes" maxLength={1000} defaultValue={kol?.notes} style={{ minHeight: 64 }} /></div>
      <div className="row">
        <button className="primary" disabled={pending}>{pending ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Simpan KOL'}</button>
        {state?.ok && <span className="ok" role="status">{state.ok}</span>}
        {state?.error && <span className="error" role="alert">{state.error}</span>}
      </div>
    </form>
  );
}
