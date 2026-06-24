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
