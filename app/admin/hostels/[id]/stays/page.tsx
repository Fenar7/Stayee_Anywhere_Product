import HostelStaysView from "@/components/hostel-management/HostelStaysView";

export const dynamic = "force-dynamic";

export default async function AdminHostelStaysPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HostelStaysView hostelId={id} baseRoute={`/admin/hostels/${id}`} />;
}
