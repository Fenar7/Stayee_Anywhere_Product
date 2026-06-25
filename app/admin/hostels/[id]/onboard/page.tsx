import HostelOnboardView from "@/components/hostel-management/HostelOnboardView";

export default async function AdminHostelOnboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HostelOnboardView hostelId={id} baseRoute={`/admin/hostels/${id}`} />;
}
