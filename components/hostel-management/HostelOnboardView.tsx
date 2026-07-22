"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Building2, BedDouble, CheckCircle2, Layers, Phone, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { notify } from "@/lib/toast";
import { DurationType, FoodPlan } from "@prisma/client";
import { onboardingLinkWithPassword } from "@/lib/whatsapp/templates";
import { buildWaMeLink } from "@/lib/whatsapp/utils";

interface HostelOption {
  id: string;
  name: string;
  accommodationType: string;
}

interface AvailableBed {
  id: string;
  label: string;
  roomNumber: string;
  sharingType: string;
  floorName: string;
  flatName: string | null;
}

const PHONE_REGEX = /^\+91[0-9]{10}$/;

import { HostelWorkspaceLayout } from "./HostelWorkspaceLayout";

export default function HostelOnboardView({ hostelId, hostelName, baseRoute }: { hostelId: string | null; hostelName?: string; baseRoute: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState(() => searchParams.get("phone") || "");
  const [phoneError, setPhoneError] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationType, setDurationType] = useState<DurationType>(
    DurationType.MONTHLY
  );
  const [foodPlan, setFoodPlan] = useState<FoodPlan>(FoodPlan.NOT_INCLUDED);
  const [isNewAdmission, setIsNewAdmission] = useState(true);
  const [admissionFee, setAdmissionFee] = useState("0");
  const [monthlyRent, setMonthlyRent] = useState("0");
  const [securityDeposit, setSecurityDeposit] = useState("0");
  const [foodCharges, setFoodCharges] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [availableBeds, setAvailableBeds] = useState<AvailableBed[]>([]);
  const [selectedBedId, setSelectedBedId] = useState("");
  const [bedSearchTerm, setBedSearchTerm] = useState("");
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<string>("ALL");

  const filteredBeds = useMemo(() => {
    return availableBeds.filter((bed) => {
      const matchesSearch =
        !bedSearchTerm.trim() ||
        bed.label.toLowerCase().includes(bedSearchTerm.toLowerCase()) ||
        bed.roomNumber.toLowerCase().includes(bedSearchTerm.toLowerCase()) ||
        (bed.flatName && bed.flatName.toLowerCase().includes(bedSearchTerm.toLowerCase()));

      const matchesFloor =
        selectedFloorFilter === "ALL" || bed.floorName === selectedFloorFilter;

      return matchesSearch && matchesFloor;
    });
  }, [availableBeds, bedSearchTerm, selectedFloorFilter]);

  const availableFloors = useMemo(() => {
    const set = new Set<string>();
    availableBeds.forEach((b) => {
      if (b.floorName) set.add(b.floorName);
    });
    return Array.from(set).sort();
  }, [availableBeds]);

  const bedHierarchy = useMemo(() => {
    const floorMap = new Map<string, Map<string, AvailableBed[]>>();

    filteredBeds.forEach((bed) => {
      const floorKey = bed.floorName || "General Floor";
      const roomKey = bed.roomNumber;

      if (!floorMap.has(floorKey)) {
        floorMap.set(floorKey, new Map());
      }
      const roomMap = floorMap.get(floorKey)!;

      if (!roomMap.has(roomKey)) {
        roomMap.set(roomKey, []);
      }
      roomMap.get(roomKey)!.push(bed);
    });

    return floorMap;
  }, [filteredBeds]);
  const [loading, setLoading] = useState(false);
  const [submittedLink, setSubmittedLink] = useState("");
  const [submittedPassword, setSubmittedPassword] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const [hostels, setHostels] = useState<HostelOption[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState(
    () => hostelId || searchParams.get("hostelId") || ""
  );
  const [hostelsLoading, setHostelsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (selectedHostelId) return;

    setHostelsLoading(true);
    fetch("/api/admin/hostels")
      .then(async (res) => {
        if (!res.ok) throw new Error("not admin");
        const data = await res.json();
        setHostels(data.map((h: HostelOption) => ({ id: h.id, name: h.name, accommodationType: h.accommodationType })));
        setIsAdmin(true);
      })
      .catch(() => {
        setIsAdmin(false);
      })
      .finally(() => setHostelsLoading(false));
  }, [selectedHostelId]);

  const totalPayable =
    (parseFloat(admissionFee) || 0) + (parseFloat(monthlyRent) || 0) + (parseFloat(securityDeposit) || 0) + (parseFloat(foodCharges) || 0) - (parseFloat(discount) || 0);

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
    if (!joiningDate) {
      notify.error("Please select a joining date");
      return;
    }
    if (durationType !== DurationType.MONTHLY && !endDate) {
      notify.error("Please select an end date");
      return;
    }
    if (endDate && new Date(endDate) <= new Date(joiningDate)) {
      notify.error("End date must be after joining date");
      return;
    }

    setLoading(true);
    setAvailableBeds([]);
    setSelectedBedId("");

    try {
      const params = new URLSearchParams({ joiningDate });
      if (endDate) {
        params.set("endDate", endDate);
      }
      if (selectedHostelId) {
        params.set("hostelId", selectedHostelId);
      }

      const response = await fetch(
        `/api/warden/beds/available?${params.toString()}`
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch available beds");
      }

      const data = await response.json();
      setAvailableBeds(data.availableBeds || []);

      if (!data.availableBeds || data.availableBeds.length === 0) {
        notify.error("No available beds found for the selected date range.");
      }
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBedId) {
      notify.error("Please select a bed");
      return;
    }
    if (totalPayable < 0) {
      notify.error(
        "Total payable cannot be negative. Please check your discount amount."
      );
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        phone,
        bedId: selectedBedId,
        joiningDate,
        endDate: endDate || null,
        durationType,
        foodPlan,
        isNewAdmission,
        admissionFee: parseFloat(admissionFee) || 0,
        monthlyRent: parseFloat(monthlyRent) || 0,
        securityDeposit: parseFloat(securityDeposit) || 0,
        foodCharges: parseFloat(foodCharges) || 0,
        discount: parseFloat(discount) || 0,
      };

      if (selectedHostelId) {
        payload.hostelId = selectedHostelId;
      }

      const response = await fetch("/api/warden/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create onboarding request");
      }

      const data = await response.json();
      const fullLink = `${window.location.origin}${data.entryGateLink}`;
      setSubmittedLink(fullLink);
      setSubmittedPassword(data.tempPassword || "");
      setStep(5);
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : "An error occurred");
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

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(submittedPassword);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 3000);
    } catch {
      const el = document.createElement("textarea");
      el.value = submittedPassword;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 3000);
    }
  };

  const handleWhatsAppShare = () => {
    const message = onboardingLinkWithPassword(submittedLink, submittedPassword);
    window.open(buildWaMeLink(phone, message), "_blank");
  };

  const hostelSelected = !!selectedHostelId;
  const showHostelPicker = isAdmin && !hostelSelected && !hostelsLoading;
  const totalSteps = showHostelPicker ? 5 : 4;

  const stepLabels = useMemo(() => {
    if (showHostelPicker) {
      return [
        { num: 1, label: "Hostel", icon: Building2 },
        { num: 2, label: "Prospect Phone", icon: Phone },
        { num: 3, label: "Dates & Bed", icon: BedDouble },
        { num: 4, label: "Financials", icon: CreditCard },
        { num: 5, label: "Complete", icon: CheckCircle2 },
      ];
    }
    return [
      { num: 1, label: "Prospect Phone", icon: Phone },
      { num: 2, label: "Dates & Bed", icon: BedDouble },
      { num: 3, label: "Financials", icon: CreditCard },
      { num: 4, label: "Complete", icon: CheckCircle2 },
    ];
  }, [showHostelPicker]);

  const inputClass =
    "w-full rounded-xl border border-input bg-background/80 px-3.5 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all h-11";

  const selectClass =
    "w-full rounded-xl border border-input bg-background/80 px-3.5 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all h-11";

  return (
    <HostelWorkspaceLayout
      hostelId={hostelId || ""}
      hostelName={hostelName}
      title="Onboard New Tenant"
      subtitle="Create a new onboarding request for a prospective tenant"
      hideAdminNav={baseRoute === "/warden"}
    >
      <div className="max-w-3xl mx-auto space-y-6 p-4 sm:p-6">

        {/* Apple Glassmorphism Segmented Stepper Bar */}
        <div className="p-1.5 rounded-2xl bg-muted/40 backdrop-blur-md border border-border/50 shadow-2xs flex items-center justify-between gap-1 overflow-x-auto custom-scrollbar">
          {stepLabels.map((s) => {
            const IconComponent = s.icon;
            const isActive = step === s.num;
            const isCompleted = step > s.num;

            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (isCompleted) setStep(s.num);
                }}
                disabled={!isCompleted && !isActive}
                className={`flex items-center gap-2 py-2 px-3 sm:px-4 rounded-xl text-xs font-semibold transition-all duration-200 shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02] cursor-default"
                    : isCompleted
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                    : "text-muted-foreground opacity-60 cursor-not-allowed"
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-lg text-[10px] font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : isCompleted
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {isCompleted ? "✓" : s.num}
                </span>
                <span className="hidden sm:inline tracking-tight">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Apple Glassmorphism Main Container Card */}
        <div className="relative rounded-2xl border border-border/70 bg-card/90 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/40 overflow-hidden transition-all duration-300">
          {/* Top Gradient Accent Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

          <div className="p-6 sm:p-8">
          {/* ── Step 1: Hostel Selection (admin only, when no hostel pre-selected) ── */}
          {step === 1 && showHostelPicker && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Step 1: Select Hostel
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose which hostel to onboard this tenant into.
              </p>
              <div className="space-y-2">
                <Label htmlFor="hostel-select">Hostel</Label>
                <Select value={selectedHostelId} onValueChange={(val) => setSelectedHostelId(val || "")}>
                  <SelectTrigger id="hostel-select" className={selectClass}>
                    <SelectValue placeholder="-- Select a Hostel --" />
                  </SelectTrigger>
                  <SelectContent>
                    {hostels.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name} ({h.accommodationType === "MENS" ? "Men" : "Women"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(baseRoute)}
                >
                  Back to Dashboard
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedHostelId) {
                      notify.error("Please select a hostel");
                      return;
                    }
                    setStep(2);
                  }}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 1 (or 2): Phone ── */}
          {step === 1 && !showHostelPicker && (
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
                <PhoneInput
                  id="phone-input"
                  value={phone}
                  onChange={(val) => {
                    setPhone(val);
                    setPhoneError("");
                  }}
                  error={!!phoneError}
                />
                {phoneError && (
                  <p className="text-xs text-red-600">{phoneError}</p>
                )}
              </div>
              <Button
                onClick={() => {
                  if (handlePhoneValidation()) {
                    setStep(2);
                  }
                }}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && showHostelPicker && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Step 2: Prospect Phone Number
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter the Indian mobile number of the new prospect.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="phone-input-2">
                  Phone Number
                </label>
                <PhoneInput
                  id="phone-input-2"
                  value={phone}
                  onChange={(val) => {
                    setPhone(val);
                    setPhoneError("");
                  }}
                  error={!!phoneError}
                />
                {phoneError && (
                  <p className="text-xs text-red-600">{phoneError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (handlePhoneValidation()) {
                      setStep(3);
                    }
                  }}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 2/3: Dates & Bed ── */}
          {((step === 2 && !showHostelPicker) || (step === 3 && showHostelPicker)) && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Step {showHostelPicker ? 3 : 2}: Dates &amp; Bed Selection
              </h2>
              {/* Duration Mode Selector Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Stay Duration Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl border border-border/50">
                  <button
                    type="button"
                    onClick={() => {
                      setDurationType(DurationType.MONTHLY);
                      setEndDate("");
                      setAvailableBeds([]);
                      setSelectedBedId("");
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      durationType === DurationType.MONTHLY
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>🔄 Monthly (Open-Ended)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDurationType(DurationType.CUSTOM);
                      setAvailableBeds([]);
                      setSelectedBedId("");
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      durationType !== DurationType.MONTHLY
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>⏱️ Fixed Duration Stay</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="joining-date"
                  >
                    Joining Date
                  </label>
                  <Input
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

                {durationType === DurationType.MONTHLY ? (
                  <div className="flex items-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400">
                    <div>
                      <p className="font-semibold text-xs text-blue-700 dark:text-blue-300 mb-0.5">🔄 Monthly Recurring Stay</p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Resident stays open-ended. Next rent invoice automatically scheduled in 30 days from joining date.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="end-date">
                      End Date
                    </label>
                    <Input
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
                )}
              </div>

              {durationType !== DurationType.MONTHLY && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Quick Duration Presets</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "1 Month", days: 30 },
                      { label: "3 Months", days: 90 },
                      { label: "6 Months", days: 180 },
                      { label: "1 Year", days: 365 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          if (!joiningDate) {
                            notify.error("Please select a joining date first");
                            return;
                          }
                          const start = new Date(joiningDate);
                          start.setDate(start.getDate() + preset.days);
                          setEndDate(start.toISOString().split("T")[0]);
                          setAvailableBeds([]);
                          setSelectedBedId("");
                        }}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary transition-colors"
                      >
                        +{preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleSearchBeds}
                disabled={loading || !joiningDate || (durationType !== DurationType.MONTHLY && !endDate)}
                className="w-full"
                variant="outline"
              >
                {loading ? "Searching..." : "Find Available Beds"}
              </Button>

              {/* Apple-Grade Visual Spatial Bed Matrix */}
              {availableBeds.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-border/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/50">
                    <div>
                      <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-primary" />
                        Available Beds Spatial Matrix
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {filteredBeds.length} bed{filteredBeds.length === 1 ? "" : "s"} available across {availableFloors.length} floor{availableFloors.length === 1 ? "" : "s"}
                      </p>
                    </div>

                    {/* Quick Search */}
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search room or bed..."
                        value={bedSearchTerm}
                        onChange={(e) => setBedSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-xs bg-muted/30 rounded-lg border-border/60 focus-visible:ring-1"
                      />
                    </div>
                  </div>

                  {/* Floor Filter Pills */}
                  {availableFloors.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5 pb-1">
                      <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
                        <Layers className="h-3 w-3" /> Floor:
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedFloorFilter("ALL")}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                          selectedFloorFilter === "ALL"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        All ({availableBeds.length})
                      </button>
                      {availableFloors.map((floor) => {
                        const count = availableBeds.filter((b) => b.floorName === floor).length;
                        return (
                          <button
                            key={floor}
                            type="button"
                            onClick={() => setSelectedFloorFilter(floor)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                              selectedFloorFilter === floor
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                          >
                            {floor} ({count})
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Bed Spatial Matrix Container */}
                  <div className="max-h-[380px] overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                    {filteredBeds.length === 0 ? (
                      <div className="p-8 text-center rounded-xl border border-dashed border-border/60 bg-muted/10">
                        <p className="text-xs text-muted-foreground">No beds match your filter criteria.</p>
                      </div>
                    ) : (
                      Array.from(bedHierarchy.entries()).map(([floorName, roomMap]) => (
                        <div key={floorName} className="space-y-3">
                          {/* Floor Header */}
                          <div className="flex items-center gap-2 px-1">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              {floorName}
                            </h4>
                            <div className="h-px flex-1 bg-border/40" />
                          </div>

                          {/* Room Cards Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Array.from(roomMap.entries()).map(([roomNumber, beds]) => {
                              const firstBed = beds[0];
                              return (
                                <div
                                  key={roomNumber}
                                  className="p-3 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-2xs space-y-2.5 hover:border-border transition-all"
                                >
                                  {/* Room Card Header */}
                                  <div className="flex items-center justify-between gap-2 border-b border-border/30 pb-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-semibold text-foreground">
                                        Room {roomNumber}
                                      </span>
                                      {firstBed.flatName && (
                                        <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                          {firstBed.flatName}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-medium text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                                      {firstBed.sharingType}
                                    </span>
                                  </div>

                                  {/* Bed Chips Grid */}
                                  <div className="grid grid-cols-2 gap-2">
                                    {beds.map((bed) => {
                                      const isSelected = selectedBedId === bed.id;
                                      return (
                                        <button
                                          key={bed.id}
                                          type="button"
                                          onClick={() => setSelectedBedId(bed.id)}
                                          className={`relative p-2.5 rounded-lg border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                                            isSelected
                                              ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/40 shadow-xs scale-[1.02]"
                                              : "border-border/60 bg-background/80 hover:bg-accent/60 hover:border-primary/40 text-foreground"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between w-full">
                                            <span className="text-xs font-bold tracking-tight">
                                              {bed.label}
                                            </span>
                                            {isSelected && (
                                              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                                            )}
                                          </div>
                                          <span className="text-[10px] text-muted-foreground mt-1">
                                            Available
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(showHostelPicker ? 2 : 1);
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    setStep(showHostelPicker ? 4 : 3);
                  }}
                  disabled={!selectedBedId}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3/4: Fees ── */}
          {((step === 3 && !showHostelPicker) || (step === 4 && showHostelPicker)) && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Step {showHostelPicker ? 4 : 3}: Fees &amp; Food Configuration
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="admission-fee"
                  >
                    Admission Fee (₹)
                  </label>
                  <Input
                    id="admission-fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={admissionFee}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAdmissionFee(e.target.value)
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
                  <Input
                    id="monthly-rent"
                    type="number"
                    step="0.01"
                    min="0"
                    value={monthlyRent}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setMonthlyRent(e.target.value)
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
                  <Input
                    id="security-deposit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={securityDeposit}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSecurityDeposit(e.target.value)
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
                  <Input
                    id="food-charges"
                    type="number"
                    step="0.01"
                    min="0"
                    value={foodCharges}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFoodCharges(e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="discount">
                    Discount (₹)
                  </label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={discount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDiscount(e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration-type">Duration Type</Label>
                  <Select value={durationType} onValueChange={(val) => setDurationType(val as DurationType)}>
                    <SelectTrigger id="duration-type" className={selectClass}>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DurationType.MONTHLY}>Monthly</SelectItem>
                      <SelectItem value={DurationType.WEEKLY}>Weekly</SelectItem>
                      <SelectItem value={DurationType.DAILY}>Daily</SelectItem>
                      <SelectItem value={DurationType.CUSTOM}>Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="food-plan">Food Plan</Label>
                  <Select value={foodPlan} onValueChange={(val) => setFoodPlan(val as FoodPlan)}>
                    <SelectTrigger id="food-plan" className={selectClass}>
                      <SelectValue placeholder="Select food plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FoodPlan.NOT_INCLUDED}>Not Included</SelectItem>
                      <SelectItem value={FoodPlan.BREAKFAST_ONLY}>Breakfast Only</SelectItem>
                      <SelectItem value={FoodPlan.BREAKFAST_DINNER}>Breakfast &amp; Dinner</SelectItem>
                      <SelectItem value={FoodPlan.BLD}>Breakfast, Lunch &amp; Dinner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                <Checkbox
                  checked={isNewAdmission}
                  onCheckedChange={(checked) => setIsNewAdmission(!!checked)}
                />
                New Admission
              </label>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(showHostelPicker ? 3 : 2);
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    setStep(showHostelPicker ? 5 : 4);
                  }}
                  disabled={totalPayable < 0}
                  className="flex-1"
                >
                  Review &amp; Submit
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 4/5: Review & Submit ── */}
          {((step === 4 && !showHostelPicker) || (step === 5 && showHostelPicker)) && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Step {showHostelPicker ? 5 : 4}: Review &amp; Submit
              </h2>
              <div className="rounded-lg border bg-muted p-4 space-y-2 text-sm">
                {hostelSelected && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hostel</span>
                    <span className="font-medium">
                      {hostels.find((h) => h.id === selectedHostelId)?.name || selectedHostelId}
                    </span>
                  </div>
                )}
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

              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer rounded-lg border p-3">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(!!checked)}
                />
                I confirm all the details above are correct and I am authorized to onboard this tenant.
              </label>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirmed(false);
                    setStep(showHostelPicker ? 4 : 3);
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !confirmed}
                  className="flex-1"
                >
                  {loading ? "Submitting..." : "Confirm & Send Onboarding Link"}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 5/6: Success ── */}
          {((step === 5 && !showHostelPicker) || (step === 6 && showHostelPicker)) && (
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

              {submittedPassword && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/30 p-4 text-left space-y-2">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    Access Password (one-time)
                  </p>
                  <p className="text-lg font-bold font-mono tracking-wider text-amber-900 dark:text-amber-200">
                    {submittedPassword}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Share this password with the prospect along with the link above.
                    It is valid until they set their own account password.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className="flex-1"
                  >
                    {linkCopied ? "✓ Link Copied!" : "Copy Link"}
                  </Button>
                  {submittedPassword && (
                    <Button
                      onClick={handleCopyPassword}
                      variant="outline"
                      className="flex-1"
                    >
                      {passwordCopied ? "✓ Password Copied!" : "Copy Password"}
                    </Button>
                  )}
                </div>
                <Button
                  onClick={handleWhatsAppShare}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Share on WhatsApp
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push(baseRoute)}
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
    </HostelWorkspaceLayout>
  );
}
