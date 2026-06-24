import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton() {
  return (
    <div className="border rounded-xl w-full">
      <div className="border-b p-4">
        <Skeleton className="h-6 w-[150px]" />
      </div>
      <div className="p-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-3 w-[200px]" />
            </div>
            <Skeleton className="h-8 w-[100px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
