import { notFound } from 'next/navigation';
import { requireUser, getAccessibleForm } from '@/lib/auth';
import { db } from '@/lib/db';
import { isStatus } from '@/lib/shipping';
import { listShipments } from '@/lib/shipments';
import PageHeader from '@/components/PageHeader';
import FormTabs from '@/components/FormTabs';
import ShipmentsBoard from '@/components/ShipmentsBoard';

export const dynamic = 'force-dynamic';

export default async function FormShipmentsPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const form = await getAccessibleForm(user, id);
  if (!form) notFound();
  const brand = await db.get('SELECT name FROM brands WHERE id=?', form.brand_id);
  const status = isStatus(sp.status) ? sp.status : '';

  return (
    <>
      <PageHeader title={form.title} subtitle={brand.name} />
      <FormTabs formId={form.id} active="shipments" />
      <ShipmentsBoard rows={(await listShipments(user, { formId: form.id }))} status={status} q={typeof sp.q === 'string' ? sp.q.slice(0, 100) : ''} />
    </>
  );
}
