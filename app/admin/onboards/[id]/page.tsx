import OnboardDetailsPageView from "@/components/hostel-management/OnboardDetailsPageView";

export const dynamic = "force-dynamic";

export default async function AdminOnboardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OnboardDetailsPageView stayId={id} backUrl="/admin/onboards" />;
}
