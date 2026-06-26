"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/toast";
import { Loader2, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

export function PaymentForm({ serviceRequestId, amount, typeLabel }: { serviceRequestId: string, amount: number, typeLabel: string }) {
  const router = useRouter();
  const [refNo, setRefNo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refNo || !file) {
      notify.error("Please provide both UTR number and a screenshot.");
      return;
    }
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("transactionRefNo", refNo);
      formData.append("screenshot", file);

      const res = await fetch(`/api/tenant/service-requests/${serviceRequestId}/payment`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload payment.");
      }

      notify.success("Payment uploaded successfully. Pending verification.");
      router.push("/tenant");
      router.refresh();
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto shadow-xl ring-1 ring-border/50 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Pending Payment</CardTitle>
        <CardDescription className="text-muted-foreground mt-1">Upload payment details for {typeLabel}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/50 p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-300 uppercase tracking-wider">Amount Due</p>
            <p className="text-4xl font-extrabold text-orange-600 dark:text-orange-400 mt-2">₹{amount.toLocaleString("en-IN")}</p>
          </div>
          <div className="space-y-3">
            <Label htmlFor="refNo" className="font-semibold">Transaction Ref No (UTR)</Label>
            <Input 
              id="refNo" 
              placeholder="e.g. 123456789012" 
              value={refNo} 
              onChange={(e) => setRefNo(e.target.value)} 
              required 
              className="bg-background shadow-sm"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="screenshot" className="font-semibold">Payment Screenshot</Label>
            <Input 
              id="screenshot" 
              type="file" 
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
              required 
              className="bg-background shadow-sm cursor-pointer file:cursor-pointer file:text-primary file:font-semibold"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full font-bold shadow-sm h-12 text-md bg-orange-600 hover:bg-orange-700 text-white" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}
            Submit Payment
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
