import HostelOnboardsView from "@/components/hostel-management/HostelOnboardsView";

export const dynamic = "force-dynamic";

export default async function AdminHostelOnboardsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HostelOnboardsView hostelId={id} baseRoute={`/admin/hostels/${id}`} />;
}
