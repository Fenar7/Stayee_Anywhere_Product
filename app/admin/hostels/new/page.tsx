"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const AccommodationType = {
  MENS: "MENS",
  WOMENS: "WOMENS",
} as const;

const createHostelSchema = z.object({
  name: z.string().min(1, "Hostel name is required"),
  address: z.string().min(1, "Address is required"),
  accommodationType: z.enum([AccommodationType.MENS, AccommodationType.WOMENS], {
    errorMap: () => ({ message: "Select a valid accommodation type" }),
  }),
  wardenEmail: z.string().email("Invalid email for warden"),
  wardenPhone: z
    .string()
    .regex(/^\+\d{1,3}\d{6,14}$/, "Phone must start with country code (e.g. +91) and have 10-15 digits"),
  wardenPassword: z.string().min(8, "Password must be at least 8 characters"),
});

type HostelFormValues = z.infer<typeof createHostelSchema>;

export default function NewHostelPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HostelFormValues>({
    resolver: zodResolver(createHostelSchema),
    defaultValues: {
      accommodationType: AccommodationType.MENS,
      wardenPhone: "+91",
    },
  });

  async function onSubmit(data: HostelFormValues) {
    setServerError(null);
    try {
      const res = await fetch("/api/admin/hostels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setServerError(err.error || "Failed to create hostel");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setServerError("An unexpected error occurred. Please try again.");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div className="flex items-center space-x-2">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create New Hostel</h1>
        <p className="text-muted-foreground">
          Register a new hostel property and provision a warden user account for it.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-card border rounded-lg p-6 shadow-sm">
        {serverError && (
          <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm font-medium">
            {serverError}
          </div>
        )}

        {/* Section 1: Hostel Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Hostel Information</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">
                Hostel Name
              </label>
              <input
                id="name"
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="e.g. Hostel Alpha"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-destructive text-xs">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="accommodationType" className="text-sm font-medium">
                Accommodation Type
              </label>
              <select
                id="accommodationType"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register("accommodationType")}
              >
                <option value={AccommodationType.MENS}>Men's Hostel</option>
                <option value={AccommodationType.WOMENS}>Women's Hostel</option>
              </select>
              {errors.accommodationType && (
                <p className="text-destructive text-xs">{errors.accommodationType.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="address" className="text-sm font-medium">
              Address
            </label>
            <textarea
              id="address"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="e.g. 123 Main Road, Mumbai"
              {...register("address")}
            />
            {errors.address && (
              <p className="text-destructive text-xs">{errors.address.message}</p>
            )}
          </div>
        </div>

        {/* Section 2: Warden Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Warden Account Details</h2>
          <p className="text-sm text-muted-foreground">
            A new user account with the Warden role will be created automatically.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="wardenEmail" className="text-sm font-medium">
                Email Address
              </label>
              <input
                id="wardenEmail"
                type="email"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="warden@nexthome.com"
                {...register("wardenEmail")}
              />
              {errors.wardenEmail && (
                <p className="text-destructive text-xs">{errors.wardenEmail.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="wardenPhone" className="text-sm font-medium">
                Phone Number
              </label>
              <input
                id="wardenPhone"
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="e.g. +919999999999"
                {...register("wardenPhone")}
              />
              {errors.wardenPhone && (
                <p className="text-destructive text-xs">{errors.wardenPhone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="wardenPassword" className="text-sm font-medium">
              Initial Password
            </label>
            <div className="relative">
              <input
                id="wardenPassword"
                type={showPassword ? "text" : "password"}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Enter warden account password"
                {...register("wardenPassword")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.wardenPassword && (
              <p className="text-destructive text-xs">{errors.wardenPassword.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Link href="/admin">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Hostel & Warden
          </Button>
        </div>
      </form>
    </div>
  );
}
