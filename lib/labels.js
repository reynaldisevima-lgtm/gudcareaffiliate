// Data label pengiriman. Ref: r<responseId> = affiliate (jawaban form), k<shipmentId> = pengiriman KOL.
// Pengirim = brand + no. HP brand; penerima = nama, no. HP, alamat, dan barang.
import { db } from '@/lib/db';
import { brandScope, canAffiliate, canKol } from '@/lib/auth';
import { respondent } from '@/lib/shipping';
import { parseKol } from '@/lib/kol';

const PHONE_LABEL = /(\bhp\b|handphone|whats ?app|\bwa\b|telepon|telp|phone|ponsel|nomor)/i;

// No. HP affiliate: pertanyaan singkat yang labelnya mirip "No. HP/WhatsApp", selain itu jawaban singkat kedua.
function affiliatePhone(questions, answers, who) {
  const q = questions.find((q) => q.type === 'short' && PHONE_LABEL.test(q.label) && typeof answers[q.id] === 'string' && answers[q.id].trim());
  return q ? answers[q.id].trim() : /\d{8,}/.test(who.detail.replace(/\D/g, '')) ? who.detail : '';
}

const inList = (n) => Array(n).fill('?').join(',');

export async function loadLabels(user, refs) {
  const rIds = [...new Set(refs.filter((r) => /^r\d+$/.test(r)).map((r) => Number(r.slice(1))))];
  const kIds = [...new Set(refs.filter((r) => /^k\d+$/.test(r)).map((r) => Number(r.slice(1))))];
  const scope = brandScope(user);
  const out = new Map();

  if (rIds.length && canAffiliate(user)) {
    const rows = await db.all(
      `SELECT r.id, r.answers, f.questions, f.title AS form_title, b.id AS brand_id, b.name AS brand_name, b.phone AS brand_phone, COALESCE(b.logo,'')<>'' AS brand_has_logo,
              s.items, s.courier
       FROM responses r JOIN forms f ON f.id=r.form_id JOIN brands b ON b.id=f.brand_id
       LEFT JOIN shipments s ON s.response_id=r.id
       WHERE r.id IN (${inList(rIds.length)}) AND r.deleted_at IS NULL AND f.deleted_at IS NULL AND ${scope.sql}`,
      ...rIds, ...scope.args
    );
    for (const row of rows) {
      const questions = JSON.parse(row.questions);
      const answers = JSON.parse(row.answers);
      const who = respondent(questions, answers, row.id);
      const addrQ = questions.find((q) => q.type === 'address' && answers[q.id] && typeof answers[q.id] === 'object');
      out.set(`r${row.id}`, {
        ref: `r${row.id}`, kind: 'affiliate', brandId: row.brand_id, context: row.form_title,
        sender: { name: row.brand_name, phone: row.brand_phone || '', logo: row.brand_has_logo ? `/api/brand-logo/${row.brand_id}` : null },
        recipient: { name: who.name, phone: affiliatePhone(questions, answers, who), address: addrQ ? answers[addrQ.id] : null },
        items: row.items || '', courier: row.courier || '',
      });
    }
  }

  if (kIds.length && canKol(user)) {
    const rows = await db.all(
      `SELECT s.id, s.items, s.courier, k.name, k.phone, k.address, k.socials,
              b.id AS brand_id, b.name AS brand_name, b.phone AS brand_phone, COALESCE(b.logo,'')<>'' AS brand_has_logo
       FROM shipments s JOIN kols k ON k.id=s.kol_id JOIN brands b ON b.id=k.brand_id
       WHERE s.id IN (${inList(kIds.length)}) AND k.deleted_at IS NULL AND ${scope.sql}`,
      ...kIds, ...scope.args
    );
    for (const row of rows.map(parseKol)) {
      out.set(`k${row.id}`, {
        ref: `k${row.id}`, kind: 'kol', brandId: row.brand_id, context: 'KOL',
        sender: { name: row.brand_name, phone: row.brand_phone || '', logo: row.brand_has_logo ? `/api/brand-logo/${row.brand_id}` : null },
        recipient: { name: row.name, phone: row.phone, address: row.address },
        items: row.items || '', courier: row.courier || '',
      });
    }
  }
  // Urutan mengikuti pilihan pengguna.
  return [...new Set(refs)].map((r) => out.get(r)).filter(Boolean);
}
