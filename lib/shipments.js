import { db } from '@/lib/db';
import { respondent } from '@/lib/shipping';

// Semua pengisi yang boleh dilihat user, beserta status pengirimannya.
// Pengisi tanpa catatan pengiriman dianggap 'pending'.
export async function listShipments(user, { formId } = {}) {
  const where = [];
  const args = [];
  if (user.role !== 'admin') { where.push('f.brand_id=?'); args.push(user.brand_id); }
  if (formId) { where.push('f.id=?'); args.push(Number(formId)); }
  const rows = await db.all(`SELECT r.id, r.answers, r.created_at, f.id AS form_id, f.title AS form_title, f.questions,
              b.name AS brand_name, s.status, s.items, s.courier, s.tracking_no, s.updated_at
       FROM responses r
       JOIN forms f ON f.id=r.form_id
       JOIN brands b ON b.id=f.brand_id
       LEFT JOIN shipments s ON s.response_id=r.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY COALESCE(s.updated_at, r.created_at) DESC, r.id DESC`, ...args);
  const questionsByForm = new Map();
  return rows.map((r) => {
    if (!questionsByForm.has(r.form_id)) questionsByForm.set(r.form_id, JSON.parse(r.questions));
    const who = respondent(questionsByForm.get(r.form_id), JSON.parse(r.answers), r.id);
    return {
      id: r.id,
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
    };
  });
}
