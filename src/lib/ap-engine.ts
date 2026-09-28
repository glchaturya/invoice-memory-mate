import type {
  DetectedException,
  ExtractedInvoice,
  MemoryCase,
  PurchaseOrder,
  Recommendation,
  Vendor,
} from "./ap-types";

/**
 * Deterministic validation layer. Runs before the AI reasoning layer and is the
 * only thing allowed to decide that an invoice IS an exception.
 */
export function detectExceptions(input: {
  extracted: ExtractedInvoice;
  vendor: Vendor | null;
  po: PurchaseOrder | null;
  duplicateOf: string | null;
}): DetectedException[] {
  const { extracted, vendor, po, duplicateOf } = input;
  const found: DetectedException[] = [];

  if (duplicateOf) {
    found.push({
      exception_type: "duplicate",
      severity: "high",
      title: `Possible duplicate of invoice ${extracted.invoice_number}`,
      detail: `Invoice number ${extracted.invoice_number} already exists in the ledger for this vendor. Payment must be held until a human confirms whether this is a re-submission.`,
      amount_delta: null,
    });
  }

  if (extracted.po_number && !po) {
    found.push({
      exception_type: "missing_information",
      severity: "medium",
      title: `Purchase order ${extracted.po_number} not found`,
      detail: `The invoice references ${extracted.po_number}, but no matching purchase order exists in the system.`,
      amount_delta: null,
    });
  }

  if (po) {
    const delta = Number(extracted.subtotal) - Number(po.po_amount);
    if (Math.abs(delta) >= 1) {
      const pct = (Math.abs(delta) / Number(po.po_amount)) * 100;
      found.push({
        exception_type: "po_mismatch",
        severity: pct >= 15 ? "high" : pct >= 3 ? "medium" : "low",
        title:
          delta > 0
            ? `Invoice exceeds purchase order by ${delta.toFixed(2)}`
            : `Invoice is below purchase order by ${Math.abs(delta).toFixed(2)}`,
        detail: `Invoiced subtotal ${extracted.subtotal.toFixed(2)} vs ${po.po_number} value ${Number(po.po_amount).toFixed(2)} — a difference of ${delta.toFixed(2)} (${pct.toFixed(1)}%).`,
        amount_delta: delta,
      });
    }
  }

  const expectedTerms = vendor?.standard_payment_terms;
  if (
    expectedTerms &&
    extracted.payment_terms &&
    normaliseTerms(extracted.payment_terms) !== normaliseTerms(expectedTerms)
  ) {
    found.push({
      exception_type: "payment_terms",
      severity: "low",
      title: `Payment terms differ from the vendor standard`,
      detail: `Invoice states "${extracted.payment_terms}" while the vendor master holds "${expectedTerms}".`,
      amount_delta: null,
    });
  }

  const missing: string[] = [];
  if (!extracted.invoice_number) missing.push("invoice number");
  if (!extracted.invoice_date) missing.push("invoice date");
  if (!extracted.due_date) missing.push("due date");
  if (!extracted.po_number) missing.push("PO number");
  if (!extracted.tax_amount) missing.push("tax / GST amount");
  if (missing.length > 0) {
    found.push({
      exception_type: "missing_information",
      severity: missing.length > 2 ? "high" : "medium",
      title: `Missing invoice information: ${missing.join(", ")}`,
      detail: `The extracted document does not carry: ${missing.join(", ")}. These fields are required before the invoice can be posted.`,
      amount_delta: null,
    });
  }

  const unusual = extracted.line_items.filter((li) => UNUSUAL.test(li.description));
  if (unusual.length > 0 && po) {
    found.push({
      exception_type: "unusual_charge",
      severity: "medium",
      title: `Unusual charge lines detected (${unusual.length})`,
      detail: unusual
        .map((li) => `${li.description} — ${li.amount.toFixed(2)}`)
        .join("; "),
      amount_delta: unusual.reduce((s, li) => s + li.amount, 0),
    });
  }

  return found;
}

const UNUSUAL =
  /freight|delivery|handling|surcharge|escalation|overtime|expedite|misc|late fee|rush/i;

function normaliseTerms(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function severityRank(s: string) {
  return s === "high" ? 3 : s === "medium" ? 2 : 1;
}

/** Rank vendor memory cases against the current exception set. */
export function findSimilarCases(
  cases: MemoryCase[],
  exceptions: DetectedException[],
  limit = 4,
): MemoryCase[] {
  const types = new Set(exceptions.map((e) => e.exception_type));
  const words = new Set(
    exceptions
      .flatMap((e) => `${e.title} ${e.detail}`.toLowerCase().match(/[a-z]{4,}/g) ?? [])
      .slice(0, 60),
  );

  return [...cases]
    .map((c) => {
      let score = 0;
      if (types.has(c.case_type as DetectedException["exception_type"])) score += 10;
      for (const tag of c.tags) if (words.has(tag.toLowerCase())) score += 3;
      for (const w of `${c.title} ${c.summary ?? ""}`.toLowerCase().match(/[a-z]{4,}/g) ?? []) {
        if (words.has(w)) score += 1;
      }
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);
}

/** Offline fallback so the demo never shows an empty recommendation. */
export function ruleBasedRecommendation(
  exception: DetectedException,
  similar: MemoryCase[],
): Recommendation {
  const memory_used = similar.map((c) => c.invoice_number ?? c.title);
  const approvedBefore = similar.filter((c) => c.outcome === "approved").length;

  if (exception.exception_type === "duplicate") {
    return {
      action: "reject",
      headline: "Hold payment — verify against the existing invoice",
      what_is_wrong: exception.detail,
      historical_pattern: similar.length
        ? `This vendor has ${similar.length} comparable case(s) on file, including duplicate re-submissions that were rejected after the original payment was confirmed.`
        : "No comparable case is stored for this vendor yet.",
      recommended_next_step:
        "Compare with the original invoice, confirm whether it has already been paid, then reject the duplicate or release it with a written justification.",
      confidence: "high",
      memory_used,
      source: "rules",
    };
  }

  if (exception.exception_type === "po_mismatch") {
    return {
      action: approvedBefore >= 2 ? "approve_after_verification" : "investigate",
      headline:
        approvedBefore >= 2
          ? "Likely a legitimate extra charge — approve after verification"
          : "Investigate the difference against the purchase order",
      what_is_wrong: exception.detail,
      historical_pattern: similar.length
        ? `${approvedBefore} of ${similar.length} similar past cases for this vendor were approved once supporting evidence was verified.`
        : "No comparable past case is stored for this vendor yet.",
      recommended_next_step:
        "Request the supporting document (delivery note, rate card or PO amendment). Approve only if the evidence matches; otherwise return the invoice at PO value.",
      confidence: similar.length ? "medium" : "low",
      memory_used,
      source: "rules",
    };
  }

  return {
    action: "investigate",
    headline: "Human review required before posting",
    what_is_wrong: exception.detail,
    historical_pattern: similar.length
      ? `${similar.length} comparable case(s) exist in this vendor's memory.`
      : "No comparable past case is stored for this vendor yet.",
    recommended_next_step:
      "Complete the missing or mismatched information with the vendor, then re-run validation.",
    confidence: "medium",
    memory_used,
    source: "rules",
  };
}
