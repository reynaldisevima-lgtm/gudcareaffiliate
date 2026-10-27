import { notFound } from 'next/navigation';
import { requireUser, getAccessibleForm } from '@/lib/auth';
import { db } from '@/lib/db';
import { deleteResponse } from '@/app/actions';
import { answerText } from '@/lib/format';
import ConfirmButton from '@/components/ConfirmButton';
import PageHeader from '@/components/PageHeader';
import FormTabs from '@/components/FormTabs';
import ReportButtons from '@/components/ReportButtons';
import { StatusTag } from '@/components/ShipmentsBoard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ResponsesPage({ params }) {
  const { id } = await params;
  const user = await requireUser();
  const form = await getAccessibleForm(user, id);
  if (!form) notFound();
  const questions = JSON.parse(form.questions);
  const rows = (await db.all(`SELECT r.id, r.answers, r.created_at, COALESCE(s.status, 'pending') AS ship_status
       FROM responses r LEFT JOIN shipments s ON s.response_id=r.id WHERE r.form_id=? AND r.deleted_at IS NULL ORDER BY r.id DESC`, form.id))
    .map((r) => ({ ...r, answers: JSON.parse(r.answers) }));

  return (
    <>
      <PageHeader title={form.title} subtitle={`${rows.length} jawaban`}>
          <ReportButtons formId={form.id} />
      </PageHeader>
      <FormTabs formId={form.id} active="responses" />

      <div className="panel scroll" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <p className="muted" style={{ padding: 20, margin: 0 }}>Belum ada jawaban.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Waktu (UTC)</th>
                <th>Pengiriman</th>
                {questions.map((q) => <th key={q.id}>{q.label}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{r.created_at}</td>
                  <td><Link href={`/dashboard/shipments/${r.id}`} aria-label="Lihat pengiriman"><StatusTag status={r.ship_status} /></Link></td>
                  {questions.map((q) => {
                    const a = r.answers[q.id];
                    return (
                      <td key={q.id}>
                        {a && typeof a === 'object' && !Array.isArray(a) && a.id ? (
                          <a href={`/api/files/${a.id}`} target="_blank" rel="noreferrer">{a.name}</a>
                        ) : (
                          answerText(a)
                        )}
                      </td>
                    );
                  })}
                  <td>
                    <form action={deleteResponse}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmButton className="small danger" message="Hapus jawaban ini? Admin masih bisa memulihkannya dari Log aktivitas.">Hapus</ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
