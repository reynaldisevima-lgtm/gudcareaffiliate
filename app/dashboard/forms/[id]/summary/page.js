import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, getAccessibleForm } from '@/lib/auth';
import { db } from '@/lib/db';
import { TYPES, HAS_OPTIONS } from '@/lib/questions';
import { RANGES, buildSummary } from '@/lib/stats';
import PageHeader from '@/components/PageHeader';
import FormTabs from '@/components/FormTabs';
import BarList from '@/components/BarList';
import TrendChart from '@/components/TrendChart';
import { fmtUtc as fmtTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

const num = (n, digits = 0) => n.toLocaleString('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: digits });

function Delta({ total, prev, days }) {
  if (prev === null) return null;
  const diff = total - prev;
  if (diff === 0) return <p className="stat-delta">Sama dengan {days} hari sebelumnya</p>;
  return (
    <p className={`stat-delta ${diff > 0 ? 'up' : 'down'}`}>
      <span aria-hidden="true">{diff > 0 ? '▲' : '▼'}</span> {diff > 0 ? '+' : '−'}{num(Math.abs(diff))} dibanding {days} hari sebelumnya
    </p>
  );
}

export default async function SummaryPage({ params, searchParams }) {
  const { id } = await params;
  const { range: rawRange } = await searchParams;
  const range = RANGES.some((r) => r.value === rawRange) ? rawRange : '30';
  const user = await requireUser();
  const form = await getAccessibleForm(user, id);
  if (!form) notFound();
  const brand = await db.get('SELECT name FROM brands WHERE id=?', form.brand_id);
  const questions = JSON.parse(form.questions);
  const rows = (await db.all('SELECT answers, created_at FROM responses WHERE form_id=?', form.id))
    .map((r) => ({ ...r, answers: JSON.parse(r.answers) }));
  const s = buildSummary(questions, rows, range);
  const typeLabel = (t) => TYPES.find((x) => x.value === t)?.label || t;

  return (
    <>
      <PageHeader title={form.title} subtitle={brand.name}>
        <a className="btn primary" href={`/api/export/${form.id}`}>Export CSV</a>
      </PageHeader>
      <FormTabs formId={form.id} active="summary" />

      <nav className="seg" aria-label="Rentang waktu">
        {RANGES.map((r) => (
          <Link key={r.value} href={`?range=${r.value}`} className={r.value === range ? 'active' : undefined} aria-current={r.value === range ? 'true' : undefined}>
            {r.label}
          </Link>
        ))}
      </nav>

      <div className="kpis">
        <div className="panel stat">
          <p className="stat-label">Jawaban masuk</p>
          <p className="stat-value">{num(s.total)}</p>
          <Delta total={s.total} prev={s.prev} days={s.days} />
        </div>
        <div className="panel stat">
          <p className="stat-label">Rata-rata per hari</p>
          <p className="stat-value">{num(s.perDay, 1)}</p>
          <p className="stat-delta">dari {num(s.spanDays)} hari</p>
        </div>
        <div className="panel stat">
          <p className="stat-label">Jawaban terakhir</p>
          <p className="stat-value small">{s.last ? fmtTime(s.last) : 'Belum ada'}</p>
          <p className="stat-delta">{num(rows.length)} jawaban sejak form dibuat</p>
        </div>
      </div>

      <div className="panel">
        <h2 style={{ marginBottom: 4 }}>Jawaban per {s.step === 7 ? 'minggu' : 'hari'}</h2>
        <p className="muted">Tanggal dalam UTC.</p>
        <TrendChart buckets={s.buckets} weekly={s.step === 7} />
        <details className="table-view">
          <summary>Lihat sebagai tabel</summary>
          {s.total === 0 ? (
            <p className="muted">Belum ada jawaban pada rentang ini.</p>
          ) : (
            <table>
              <thead><tr><th>{s.step === 7 ? 'Minggu mulai' : 'Tanggal'}</th><th>Jawaban</th></tr></thead>
              <tbody>
                {s.buckets.filter((b) => b.count > 0).reverse().map((b) => (
                  <tr key={b.date}><td>{b.date}</td><td className="num">{b.count}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </details>
      </div>

      {s.total === 0 ? (
        <div className="panel"><p className="muted" style={{ margin: 0 }}>Belum ada jawaban pada rentang ini, jadi rekap per pertanyaan belum bisa ditampilkan.</p></div>
      ) : (
        <div className="q-grid">
          {s.questions.map((q) => (
            <section className="panel" key={q.id}>
              <h2 style={{ marginBottom: 2 }}>{q.label}</h2>
              <p className="muted">
                {typeLabel(q.type)} · {num(q.answered)} dari {num(s.total)} menjawab
                {q.type === 'checkbox' && ' · persentase dari yang menjawab, bisa lebih dari 100%'}
              </p>

              {HAS_OPTIONS.includes(q.type) && <BarList rows={q.options} total={q.answered} />}

              {q.type === 'rating' && (
                <>
                  <p className="rating-avg">
                    <strong>{q.average === null ? '-' : num(q.average, 1)}</strong> <span className="muted">/ 5 rata-rata</span>
                  </p>
                  <BarList rows={q.options} total={q.answered} />
                </>
              )}

              {q.type === 'file' && <p style={{ margin: 0 }}><strong>{num(q.answered)}</strong> file diunggah.</p>}

              {q.latest && (
                q.latest.length === 0 ? (
                  <p className="muted" style={{ margin: 0 }}>Belum ada yang mengisi.</p>
                ) : (
                  <ul className="answers">
                    {q.latest.map((a, i) => (
                      <li key={i}><span>{a.text}</span><span className="muted">{fmtTime(a.at)}</span></li>
                    ))}
                  </ul>
                )
              )}
              {(q.type === 'file' || (q.latest && q.answered > q.latest.length)) && (
                <Link href={`/dashboard/forms/${form.id}/responses`} className="more-link">Lihat semua jawaban</Link>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
