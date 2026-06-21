"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

interface AvailableBed {
  id: string;
  label: string;
  roomNumber: string;
  sharingType: string;
  floorName: string;
  flatName: string;
}

export default function WardenOnboardPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationType, setDurationType] = useState<DurationType>("MONTHLY");
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

  const totalPayable = admissionFee + monthlyRent + securityDeposit + foodCharges - discount;

  const handleSearchBeds = async () => {
    if (!joiningDate || !endDate) {
      setError("Please select both joining date and end date");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/warden/beds/available?joiningDate=${joiningDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch available beds");
      }

      const data = await response.json();
      setAvailableBeds(data.availableBeds);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPhone = async () => {
    if (!phone || !phone.startsWith("+91") || phone.length !== 12) {
      setError("Please enter a valid Indian phone number (e.g., +91XXXXXXXXXX)");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (response.ok) {
        setError("This phone number is already registered to an active resident");
      } else if (response.status === 401) {
        setError("This phone number is not registered");
      } else {
        setError("An error occurred while checking phone number");
      }
    } catch (err: any) {
      setError("Failed to verify phone number");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBedId) {
      setError("Please select a bed");
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
        const data = await response.json();
        throw new Error(data.error || "Failed to create onboarding request");
      }

      const data = await response.json();
      const entryGateLink = `${window.location.origin}${data.entryGateLink}`;

      alert(
        `Onboarding request created successfully!\n\nEntry-Gate Link:\n${entryGateLink}\n\nPlease share this link with the prospect.`
      );

      router.push("/warden");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Onboard New Tenant</h1>
        <p className="text-muted-foreground">Create a new onboarding request for a prospective tenant</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Step 1: Phone Verification</h2>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="+91XXXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleSearchPhone} disabled={loading}>
                    {loading ? "Checking..." : "Verify"}
                  </Button>
                </div>
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!phone || phone.length !== 12}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Step 2: Dates & Bed Selection</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Joining Date</label>
                  <Input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleSearchBeds}
                disabled={loading || !joiningDate || !endDate}
                className="w-full"
              >
                {loading ? "Searching..." : "Find Available Beds"}
              </Button>

              {availableBeds.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select a Bed</label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableBeds.map((bed) => (
                      <button
                        key={bed.id}
                        onClick={() => setSelectedBedId(bed.id)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          selectedBedId === bed.id
                            ? "border-primary bg-primary/10"
                            : "hover:bg-muted"
                        }`}
                      >
                        <p className="font-medium">{bed.label}</p>
                        <p className="text-sm text-muted-foreground">
                          Room {bed.roomNumber} • {bed.flatName} ({bed.sharingType}) - {bed.floorName}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!selectedBedId}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Step 3: Fees & Food Configuration</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admission Fee (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={admissionFee}
                    onChange={(e) => setAdmissionFee(parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Monthly Rent (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Security Deposit (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Food Charges (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={foodCharges}
                    onChange={(e) => setFoodCharges(parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration Type</label>
                  <Select value={durationType} onValueChange={(v) => setDurationType(v as DurationType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Food Plan</label>
                  <Select value={foodPlan} onValueChange={(v) => setFoodPlan(v as FoodPlan)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOT_INCLUDED">Not Included</SelectItem>
                      <SelectItem value="BREAKFAST_ONLY">Breakfast Only</SelectItem>
                      <SelectItem value="BREAKFAST_DINNER">Breakfast & Dinner</SelectItem>
                      <SelectItem value="BLD">Breakfast, Lunch & Dinner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">
                    Total Payable: ₹{totalPayable.toFixed(2)}
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={loading}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Step 4: Submission & Sharing</h2>
              <p className="text-muted-foreground">
                Review the details and submit the onboarding request.
              </p>

              <div className="rounded-lg border bg-muted p-4 space-y-2">
                <p className="font-medium">Phone: {phone}</p>
                <p className="font-medium">Bed: {availableBeds.find((b) => b.id === selectedBedId)?.label}</p>
                <p className="font-medium">
                  Dates: {joiningDate} to {endDate}
                </p>
                <p className="font-medium">Duration: {durationType}</p>
                <p className="font-medium">
                  Food Plan: {foodPlan}
                </p>
                <p className="font-medium">
                  Total Payable: ₹{totalPayable.toFixed(2)}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)}>
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                  {loading ? "Submitting..." : "Submit Onboarding Request"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}