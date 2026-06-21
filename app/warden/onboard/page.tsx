"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { DurationType, FoodPlan } from "@prisma/client";
import { onboardingLink } from "@/lib/whatsapp/templates";
import { buildWaMeLink } from "@/lib/whatsapp/utils";

interface AvailableBed {
  id: string;
  label: string;
  roomNumber: string;
  sharingType: string;
  floorName: string;
  flatName: string | null;
}

const PHONE_REGEX = /^\+91[0-9]{10}$/;

export default function WardenOnboardPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationType, setDurationType] = useState<DurationType>(
    DurationType.MONTHLY
  );
  const [foodPlan, setFoodPlan] = useState<FoodPlan>(FoodPlan.NOT_INCLUDED);
  const [isNewAdmission, setIsNewAdmission] = useState(true);
  const [admissionFee, setAdmissionFee] = useState(0);
  const [monthlyRent, setMonthlyRent] = useState(0);
  const [securityDeposit, setSecurityDeposit] = useState(0);
  const [foodCharges, setFoodCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [availableBeds, setAvailableBeds] = useState<AvailableBed[]>([]);
  const [selectedBedId, setSelectedBedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedLink, setSubmittedLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const totalPayable =
    admissionFee + monthlyRent + securityDeposit + foodCharges - discount;

  // Client-side only phone validation — do NOT call any auth endpoint for prospect phones
  const handlePhoneValidation = (): boolean => {
    if (!PHONE_REGEX.test(phone)) {
      setPhoneError(
        "Please enter a valid Indian phone number (e.g., +91XXXXXXXXXX)"
      );
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleSearchBeds = async () => {
    if (!joiningDate || !endDate) {
      setError("Please select both joining date and end date");
      return;
    }
    if (new Date(endDate) <= new Date(joiningDate)) {
      setError("End date must be after joining date");
      return;
    }

    setLoading(true);
    setError("");
    setAvailableBeds([]);
    setSelectedBedId("");

    try {
      const response = await fetch(
        `/api/warden/beds/available?joiningDate=${encodeURIComponent(
          joiningDate
        )}&endDate=${encodeURIComponent(endDate)}`
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch available beds");
      }

      const data = await response.json();
      setAvailableBeds(data.availableBeds);

      if (data.availableBeds.length === 0) {
        setError("No available beds found for the selected date range.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBedId) {
      setError("Please select a bed");
      return;
    }
    if (totalPayable < 0) {
      setError(
        "Total payable cannot be negative. Please check your discount amount."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/warden/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          bedId: selectedBedId,
          joiningDate,
          endDate,
          durationType,
          foodPlan,
          isNewAdmission,
          admissionFee,
          monthlyRent,
          securityDeposit,
          foodCharges,
          discount,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create onboarding request");
      }

      const data = await response.json();
      const fullLink = `${window.location.origin}${data.entryGateLink}`;
      setSubmittedLink(fullLink);
      setStep(5); // move to success state
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(submittedLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch {
      // Fallback for non-HTTPS contexts
      const el = document.createElement("textarea");
      el.value = submittedLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    }
  };

  const handleWhatsAppShare = () => {
    const message = onboardingLink(submittedLink);
    window.open(buildWaMeLink("", message), "_blank");
  };

  // Shared native input class
  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

  const selectClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Onboard New Tenant</h1>
        <p className="text-muted-foreground">
          Create a new onboarding request for a prospective tenant
        </p>
      </div>

      {/* Step progress indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step > s
                  ? "bg-green-500 text-white"
                  : step === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            {s < 4 && (
              <div
                className={`h-0.5 w-8 ${
                  step > s ? "bg-green-500" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6">
          {/* ── Step 1: Phone ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Step 1: Prospect Phone Number
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter the Indian mobile number of the new prospect.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="phone-input">
                  Phone Number
                </label>
                <input
                  id="phone-input"
                  type="tel"
                  placeholder="+91XXXXXXXXXX"
                  value={phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setPhone(e.target.value);
                    setPhoneError("");
                  }}
                  className={`${inputClass} ${phoneError ? "border-red-500" : ""}`}
                />
                {phoneError && (
                  <p className="text-xs text-red-600">{phoneError}</p>
                )}
              </div>
              <Button
                onClick={() => {
                  if (handlePhoneValidation()) {
                    setStep(2);
                    setError("");
                  }
                }}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          )}

          {/* ── Step 2: Dates & Bed ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Step 2: Dates &amp; Bed Selection
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="joining-date"
                  >
                    Joining Date
                  </label>
                  <input
                    id="joining-date"
                    type="date"
                    value={joiningDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setJoiningDate(e.target.value);
                      setAvailableBeds([]);
                      setSelectedBedId("");
                    }}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="end-date">
                    End Date
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    min={joiningDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setEndDate(e.target.value);
                      setAvailableBeds([]);
                      setSelectedBedId("");
                    }}
                    className={inputClass}
                  />
                </div>
              </div>

              <Button
                onClick={handleSearchBeds}
                disabled={loading || !joiningDate || !endDate}
                className="w-full"
                variant="outline"
              >
                {loading ? "Searching..." : "Find Available Beds"}
              </Button>

              {availableBeds.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select a Bed</label>
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2">
                    {availableBeds.map((bed) => (
                      <button
                        key={bed.id}
                        type="button"
                        onClick={() => setSelectedBedId(bed.id)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          selectedBedId === bed.id
                            ? "border-primary bg-primary/10"
                            : "hover:bg-muted"
                        }`}
                      >
                        <p className="font-medium">{bed.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Room {bed.roomNumber} •{" "}
                          {bed.flatName ? `${bed.flatName} • ` : ""}
                          {bed.floorName} ({bed.sharingType})
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setError("");
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    setStep(3);
                    setError("");
                  }}
                  disabled={!selectedBedId}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Fees ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Step 3: Fees &amp; Food Configuration
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="admission-fee"
                  >
                    Admission Fee (₹)
                  </label>
                  <input
                    id="admission-fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={admissionFee}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAdmissionFee(parseFloat(e.target.value) || 0)
                    }
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="monthly-rent"
                  >
                    Monthly Rent (₹)
                  </label>
                  <input
                    id="monthly-rent"
                    type="number"
                    step="0.01"
                    min="0"
                    value={monthlyRent}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setMonthlyRent(parseFloat(e.target.value) || 0)
                    }
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="security-deposit"
                  >
                    Security Deposit (₹)
                  </label>
                  <input
                    id="security-deposit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={securityDeposit}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSecurityDeposit(parseFloat(e.target.value) || 0)
                    }
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="food-charges"
                  >
                    Food Charges (₹)
                  </label>
                  <input
                    id="food-charges"
                    type="number"
                    step="0.01"
                    min="0"
                    value={foodCharges}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFoodCharges(parseFloat(e.target.value) || 0)
                    }
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="discount">
                    Discount (₹)
                  </label>
                  <input
                    id="discount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={discount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDiscount(parseFloat(e.target.value) || 0)
                    }
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="duration-type"
                  >
                    Duration Type
                  </label>
                  <select
                    id="duration-type"
                    value={durationType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setDurationType(e.target.value as DurationType)
                    }
                    className={selectClass}
                  >
                    <option value={DurationType.MONTHLY}>Monthly</option>
                    <option value={DurationType.WEEKLY}>Weekly</option>
                    <option value={DurationType.DAILY}>Daily</option>
                    <option value={DurationType.CUSTOM}>Custom</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium" htmlFor="food-plan">
                    Food Plan
                  </label>
                  <select
                    id="food-plan"
                    value={foodPlan}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setFoodPlan(e.target.value as FoodPlan)
                    }
                    className={selectClass}
                  >
                    <option value={FoodPlan.NOT_INCLUDED}>Not Included</option>
                    <option value={FoodPlan.BREAKFAST_ONLY}>
                      Breakfast Only
                    </option>
                    <option value={FoodPlan.BREAKFAST_DINNER}>
                      Breakfast &amp; Dinner
                    </option>
                    <option value={FoodPlan.BLD}>
                      Breakfast, Lunch &amp; Dinner
                    </option>
                  </select>
                </div>
              </div>

              {/* Live total payable calculation */}
              <div
                className={`rounded-lg border p-4 ${
                  totalPayable < 0
                    ? "border-red-400 bg-red-50 dark:bg-red-900/20"
                    : "border-green-400 bg-green-50 dark:bg-green-900/20"
                }`}
              >
                <p className="text-sm font-medium text-muted-foreground">
                  Total Payable
                </p>
                <p
                  className={`text-2xl font-bold ${
                    totalPayable < 0
                      ? "text-red-600"
                      : "text-green-700 dark:text-green-400"
                  }`}
                >
                  ₹{totalPayable.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  = Admission + Rent + Deposit + Food − Discount
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNewAdmission}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setIsNewAdmission(e.target.checked)
                  }
                  className="rounded"
                />
                New Admission
              </label>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(2);
                    setError("");
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    setStep(4);
                    setError("");
                  }}
                  disabled={totalPayable < 0}
                  className="flex-1"
                >
                  Review &amp; Submit
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 4: Review & Submit ── */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Step 4: Review &amp; Submit
              </h2>
              <div className="rounded-lg border bg-muted p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">{phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bed</span>
                  <span className="font-medium">
                    {availableBeds.find((b) => b.id === selectedBedId)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Joining Date</span>
                  <span className="font-medium">{joiningDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End Date</span>
                  <span className="font-medium">{endDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{durationType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Food Plan</span>
                  <span className="font-medium">{foodPlan}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Total Payable</span>
                  <span className="font-bold text-green-700">
                    ₹{totalPayable.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(3);
                    setError("");
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "Submitting..." : "Submit Onboarding Request"}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 5: Success ── */}
          {step === 5 && (
            <div className="space-y-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400 text-3xl">
                  ✓
                </div>
                <h2 className="text-xl font-bold">
                  Onboarding Request Created!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Share the link below with the prospect to complete their
                  registration.
                </p>
              </div>

              <div className="rounded-lg border bg-muted p-4 text-left space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Registration Link
                </p>
                <p className="break-all text-sm font-mono">{submittedLink}</p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="w-full"
                >
                  {linkCopied ? "✓ Copied!" : "Copy Link"}
                </Button>
                <Button
                  onClick={handleWhatsAppShare}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Share on WhatsApp
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push("/warden")}
                  className="w-full"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}