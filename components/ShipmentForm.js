'use client';
import { useActionState, useEffect, useState } from 'react';
import { updateShipment } from '@/app/actions';
import { STATUSES, COURIERS } from '@/lib/shipping';

export default function ShipmentForm({ responseId, initial }) {
  const [state, action, pending] = useActionState(updateShipment, null);
  const [v, setV] = useState(initial);
  const [note, setNote] = useState('');
  const [notePublic, setNotePublic] = useState(false);
  const set = (patch) => setV((s) => ({ ...s, ...patch }));

  useEffect(() => { if (state?.ok) { setNote(''); setNotePublic(false); } }, [state]);

  return (
    <form action={action} className="stack">
      <input type="hidden" name="response_id" value={responseId} />
      <div>
        <label htmlFor="status">Status</label>
        <select id="status" name="status" value={v.status} onChange={(e) => set({ status: e.target.value })}>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="items">Barang yang dikirim</label>
        <input id="items" name="items" type="text" value={v.items} onChange={(e) => set({ items: e.target.value })} maxLength={500} placeholder="mis. Serum 30 ml x1, Sunscreen x1" />
      </div>
      <div className="row">
        <div className="grow">
          <label htmlFor="courier">Kurir</label>
          <input id="courier" name="courier" type="text" list="couriers" value={v.courier} onChange={(e) => set({ courier: e.target.value })} maxLength={50} />
          <datalist id="couriers">{COURIERS.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="grow">
          <label htmlFor="tracking_no">No. resi</label>
          <input id="tracking_no" name="tracking_no" type="text" value={v.tracking_no} onChange={(e) => set({ tracking_no: e.target.value })} maxLength={60} />
        </div>
      </div>
      <div>
        <label htmlFor="note">Catatan untuk riwayat (opsional)</label>
        <textarea id="note" name="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="mis. Paket dititipkan ke satpam" style={{ minHeight: 72 }} />
        <label className="opt">
          <input type="checkbox" name="note_public" checked={notePublic} onChange={(e) => setNotePublic(e.target.checked)} />
          Tampilkan catatan ini ke pengisi di halaman lacak
        </label>
      </div>
      <div className="row">
        <button className="primary" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan update'}</button>
        {state?.ok && <span className="ok" role="status">{state.ok}</span>}
        {state?.error && <span className="error" role="alert">{state.error}</span>}
      </div>
    </form>
  );
}
