export const STAY_STATUS_LABELS: Record<string, string> = {
  ONBOARDING_PENDING: "Pending Review",
  APPROVED_AWAITING_PAYMENT: "Awaiting Payment",
  ACTIVE: "Active",
  EXTENDED: "Extended",
  EARLY_EXIT: "Early Exit",
  CHECKED_OUT: "Checked Out",
  CANCELLED: "Cancelled",
};

export const STAY_STATUS_COLORS: Record<string, string> = {
  ONBOARDING_PENDING: "bg-gray-100 text-gray-800",
  APPROVED_AWAITING_PAYMENT: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-green-100 text-green-800",
  EXTENDED: "bg-blue-100 text-blue-800",
  EARLY_EXIT: "bg-purple-100 text-purple-800",
  CHECKED_OUT: "bg-slate-100 text-slate-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export interface StayStatusContext {
  status: string;
  hasProfile?: boolean;
  onboardingCurrentStep?: number;
}

export function getStayStatusDisplay(item: StayStatusContext): { label: string; colorClass: string } {
  if (item.status === "ONBOARDING_PENDING") {
    if (item.hasProfile) {
      return {
        label: "Pending Review",
        colorClass: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
      };
    }
    const step = item.onboardingCurrentStep ?? 0;
    if (step >= 1) {
      const stepText = step > 1 ? `Filling Form (Step ${step}/5)` : "Filling Form";
      return {
        label: stepText,
        colorClass: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
      };
    }
    return {
      label: "Link Sent",
      colorClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    };
  }

  return {
    label: STAY_STATUS_LABELS[item.status] || item.status,
    colorClass: STAY_STATUS_COLORS[item.status] || "bg-gray-100 text-gray-800",
  };
}

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow Up",
  CONVERTED: "Converted",
  DROPPED: "Dropped",
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-purple-100 text-purple-800",
  FOLLOW_UP: "bg-amber-100 text-amber-800",
  CONVERTED: "bg-green-100 text-green-800",
  DROPPED: "bg-gray-100 text-gray-800",
};

export const LEAD_SOURCE_COLORS: Record<string, string> = {
  WHATSAPP_BOT: "bg-emerald-100 text-emerald-800",
  MANUAL: "bg-gray-100 text-gray-800",
};
