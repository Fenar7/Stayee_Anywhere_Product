import HostelWorklistsView from "@/components/hostel-management/HostelWorklistsView";

export const dynamic = "force-dynamic";

export default async function AdminHostelWorklistsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HostelWorklistsView hostelId={id} baseRoute={`/admin/hostels/${id}`} />;
}
