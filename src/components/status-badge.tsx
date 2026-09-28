import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; tone: string }> = {
  valid: { label: "Valid", tone: "b-ok" },
  approved: { label: "Approved", tone: "b-ok" },
  resolved: { label: "Resolved", tone: "b-ok" },
  needs_review: { label: "Needs review", tone: "b-warn" },
  open: { label: "Open", tone: "b-warn" },
  reviewed: { label: "Reviewed", tone: "b-warn" },
  pending: { label: "Pending", tone: "b-mut" },
  critical: { label: "Critical", tone: "b-crit" },
  rejected: { label: "Rejected", tone: "b-crit" },
  duplicate: { label: "Possible duplicate", tone: "b-crit" },
  high: { label: "High", tone: "b-crit" },
  medium: { label: "Medium", tone: "b-warn" },
  low: { label: "Low", tone: "b-mut" },
};

export function StatusBadge({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const entry = MAP[value] ?? { label: value.replace(/_/g, " "), tone: "b-mut" };
  return <span className={cn("badge", entry.tone, className)}>{label ?? entry.label}</span>;
}

export const EXCEPTION_LABELS: Record<string, string> = {
  po_mismatch: "PO amount mismatch",
  duplicate: "Duplicate invoice",
  payment_terms: "Payment-term mismatch",
  missing_information: "Missing information",
  unusual_charge: "Unusual charge",
};
