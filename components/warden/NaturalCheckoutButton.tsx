"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";

interface NaturalCheckoutButtonProps {
  stayId: string;
}

export default function NaturalCheckoutButton({ stayId }: NaturalCheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/warden/stays/natural-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stayId }),
      });

      if (!response.ok) throw new Error("Failed to checkout");
      
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error checking out stay.");
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700">
          <CheckCircle className="h-4 w-4" />
          Checkout
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Checkout</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the stay as CHECKED_OUT and free up the bed. Are you sure you want to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => {
            e.preventDefault();
            handleCheckout();
          }} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
