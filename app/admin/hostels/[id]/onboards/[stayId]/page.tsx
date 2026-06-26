import OnboardDetailsPageView from "@/components/hostel-management/OnboardDetailsPageView";

export const dynamic = "force-dynamic";

export default async function AdminHostelOnboardDetailPage({
  params,
}: {
  params: Promise<{ id: string; stayId: string }>;
}) {
  const { id, stayId } = await params;
  return <OnboardDetailsPageView stayId={stayId} backUrl={`/admin/hostels/${id}/onboards`} />;
}
