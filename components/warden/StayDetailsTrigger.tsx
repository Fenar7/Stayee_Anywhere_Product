"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { StayLifecycleModal } from "@/components/warden/StayLifecycleModal";

export default function StayDetailsTrigger({ stayId }: { stayId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="flex items-center gap-1.5 h-8 text-xs">
        <User className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Profile</span>
      </Button>

      {open && (
        <StayLifecycleModal
          stayId={stayId}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
