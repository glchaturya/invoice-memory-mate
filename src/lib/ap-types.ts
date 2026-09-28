export type ExceptionType =
  | "po_mismatch"
  | "duplicate"
  | "payment_terms"
  | "missing_information"
  | "unusual_charge";

export type Severity = "low" | "medium" | "high";

export interface ExtractedLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface ExtractedInvoice {
  vendor_name: string;
  vendor_code: string | null;
  invoice_number: string;
  invoice_date: string | null;
  due_date: string | null;
  po_number: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_terms: string | null;
  line_items: ExtractedLineItem[];
}

export interface DetectedException {
  exception_type: ExceptionType;
  severity: Severity;
  title: string;
  detail: string;
  amount_delta: number | null;
}

export interface Recommendation {
  action: string;
  headline: string;
  what_is_wrong: string;
  historical_pattern: string;
  recommended_next_step: string;
  confidence: "low" | "medium" | "high";
  memory_used: string[];
  source: "ai" | "rules";
}

export interface Vendor {
  id: string;
  vendor_code: string;
  name: string;
  city: string | null;
  standard_payment_terms: string;
  credit_limit: number | null;
  common_patterns: string[];
  notes: string | null;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  po_amount: number;
  status: string;
  line_item_count: number;
  approved_by: string | null;
  payment_terms: string | null;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  vendor_id: string;
  po_id: string | null;
  po_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_terms: string | null;
  status: string;
  source: string;
  file_name: string | null;
  created_at: string;
}

export interface ExceptionRow {
  id: string;
  invoice_id: string;
  vendor_id: string;
  exception_type: ExceptionType;
  severity: Severity;
  title: string;
  detail: string | null;
  amount_delta: number | null;
  status: string;
  ai_recommendation: Recommendation | null;
  created_at: string;
}

export interface MemoryCase {
  id: string;
  vendor_id: string;
  invoice_number: string | null;
  case_type: string;
  title: string;
  summary: string | null;
  amount_delta: number | null;
  resolution: string | null;
  outcome: string;
  occurred_on: string | null;
  tags: string[];
}

export interface ResolutionRow {
  id: string;
  exception_id: string;
  invoice_id: string;
  vendor_id: string;
  action: string;
  resolved_by: string;
  notes: string | null;
  created_at: string;
}
