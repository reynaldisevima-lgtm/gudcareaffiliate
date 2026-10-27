import { db } from '@/lib/db';
import { brandScope, canAffiliate, canKol } from '@/lib/auth';
import { respondent } from '@/lib/shipping';

// Semua penerima pengiriman yang boleh dilihat user:
// - affiliate: setiap jawaban form (tanpa catatan pengiriman dianggap 'pending');
// - KOL: setiap pengiriman yang dibuat untuk KOL (satu KOL bisa punya beberapa).
// ref: kode untuk cetak label ("r<id jawaban>" atau "k<id pengiriman>").
export async function listShipments(user, { formId, kind } = {}) {
  const scope = brandScope(user);
  const rows = [];

  if (kind !== 'kol' && canAffiliate(user)) {
    const where = ['r.deleted_at IS NULL', 'f.deleted_at IS NULL', scope.sql];
    const args = [...scope.args];
    if (formId) { where.push('f.id=?'); args.push(Number(formId)); }
    const affiliates = await db.all(
      `SELECT r.id, r.answers, r.created_at, f.id AS form_id, f.title AS form_title, f.questions,
              b.name AS brand_name, s.status, s.items, s.courier, s.tracking_no, s.updated_at
       FROM responses r
       JOIN forms f ON f.id=r.form_id
       JOIN brands b ON b.id=f.brand_id
       LEFT JOIN shipments s ON s.response_id=r.id
       WHERE ${where.join(' AND ')}`,
      ...args
    );
    const questionsByForm = new Map();
    for (const r of affiliates) {
      if (!questionsByForm.has(r.form_id)) questionsByForm.set(r.form_id, JSON.parse(r.questions));
      const who = respondent(questionsByForm.get(r.form_id), JSON.parse(r.answers), r.id);
      rows.push({
        key: `r${r.id}`,
        ref: `r${r.id}`,
        kind: 'affiliate',
        id: r.id,
        href: `/dashboard/shipments/${r.id}`,
        formId: r.form_id,
        formTitle: r.form_title,
        brandName: r.brand_name,
        name: who.name,
        detail: who.detail,
        status: r.status || 'pending',
        items: r.items || '',
        courier: r.courier || '',
        trackingNo: r.tracking_no || '',
        updatedAt: r.updated_at || r.created_at,
        hasRecord: !!r.status,
      });
    }
  }

  if (kind !== 'affiliate' && !formId && canKol(user)) {
    const kols = await db.all(
      `SELECT s.id, s.status, s.items, s.courier, s.tracking_no, s.updated_at, k.id AS kol_id, k.name, k.phone, b.name AS brand_name
       FROM shipments s JOIN kols k ON k.id=s.kol_id JOIN brands b ON b.id=k.brand_id
       WHERE k.deleted_at IS NULL AND ${scope.sql}`,
      ...scope.args
    );
    for (const s of kols) {
      rows.push({
        key: `k${s.id}`,
        ref: `k${s.id}`,
        kind: 'kol',
        id: s.id,
        kolId: s.kol_id,
        href: `/dashboard/shipments/kol/${s.id}`,
        formTitle: 'KOL',
        brandName: s.brand_name,
        name: s.name,
        detail: s.phone,
        status: s.status,
        items: s.items || '',
        courier: s.courier || '',
        trackingNo: s.tracking_no || '',
        updatedAt: s.updated_at,
        hasRecord: true,
      });
    }
  }

  return rows.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
}
