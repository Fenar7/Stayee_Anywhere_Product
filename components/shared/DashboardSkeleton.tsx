import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-6 border rounded-xl space-y-4">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-8 w-[60px]" />
        </div>
      ))}
    </div>
  );
}
