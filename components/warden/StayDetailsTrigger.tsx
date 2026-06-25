import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

export default function StayDetailsTrigger({ stayId, baseRoute }: { stayId: string; baseRoute: string }) {
  return (
    <Link href={`${baseRoute}/stays/${stayId}`}>
      <Button variant="outline" size="sm" className="flex items-center gap-1.5 h-8 text-xs">
        <User className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Profile & Details</span>
      </Button>
    </Link>
  );
}
