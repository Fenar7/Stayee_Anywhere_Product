import { redirect } from 'next/navigation';

export default async function HostelIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/hostels/${id}/builder`);
}
