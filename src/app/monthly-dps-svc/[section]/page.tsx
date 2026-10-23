import { notFound } from 'next/navigation';
import DpSvcPanel from '../DpSvcPanel';
import { TRANSACTION_SECTIONS } from '@/lib/supplementary-transactions';

export default async function TransactionSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const entry = TRANSACTION_SECTIONS.find(item => item.slug === section);
  if (!entry) notFound();
  return <DpSvcPanel key={entry.kind} fixedTab={entry.kind} />;
}
