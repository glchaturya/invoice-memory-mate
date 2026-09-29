import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { errMessage, getHindsight, vendorTag } from "./hindsight.server";

export interface HindsightMemory {
  id: string;
  text: string;
  context: string | null;
  occurred: string | null;
  tags: string[];
}

export type HindsightStatus = "ok" | "not_configured" | "error";

export interface RecallResult {
  status: HindsightStatus;
  query: string;
  memories: HindsightMemory[];
  error?: string;
  recalled_at: string;
}

export interface RetainResult {
  status: HindsightStatus;
  error?: string;
  retained_at: string;
  bank?: string;
}

const NOT_CONFIGURED =
  "Hindsight is not configured. Add HINDSIGHT_API_URL (and HINDSIGHT_API_KEY) as server secrets.";

export const hindsightConfig = createServerFn({ method: "GET" }).handler(async () => {
  const h = getHindsight();
  return { configured: !!h, bank: h?.bankId ?? null };
});

const recallSchema = z.object({
  vendor_name: z.string().max(200),
  vendor_code: z.string().max(50),
  exception_type: z.string().max(50),
  detail: z.string().max(2000),
});

export const recallVendorMemory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => recallSchema.parse(d))
  .handler(async ({ data }): Promise<RecallResult> => {
    const query = `Previous ${data.exception_type.replace(/_/g, " ")} cases for vendor ${data.vendor_name} (${data.vendor_code}) and how AP resolved them. Current issue: ${data.detail}`;
    const recalled_at = new Date().toISOString();
    const h = getHindsight();
    if (!h) return { status: "not_configured", query, memories: [], error: NOT_CONFIGURED, recalled_at };
    try {
      const res = await h.client.recall(h.bankId, query, {
        tags: [vendorTag(data.vendor_code)],
        tagsMatch: "any_strict",
        budget: "mid",
        maxTokens: 2048,
      });
      const memories: HindsightMemory[] = (res.results ?? []).slice(0, 8).map((r) => ({
        id: r.id,
        text: r.text,
        context: r.context ?? null,
        occurred: r.occurred_start ?? r.mentioned_at ?? null,
        tags: r.tags ?? [],
      }));
      return { status: "ok", query, memories, recalled_at };
    } catch (error) {
      console.error("Hindsight recall failed", error);
      return { status: "error", query, memories: [], error: errMessage(error), recalled_at };
    }
  });

const caseSchema = z.object({
  document_id: z.string().max(100),
  vendor_name: z.string().max(200),
  vendor_code: z.string().max(50),
  invoice_number: z.string().max(100).nullable(),
  po_number: z.string().max(100).nullable(),
  invoice_date: z.string().max(40).nullable(),
  exception_type: z.string().max(50),
  exception_title: z.string().max(300),
  po_amount: z.number().nullable(),
  invoice_amount: z.number().nullable(),
  discrepancy_amount: z.number().nullable(),
  discrepancy_reason: z.string().max(2000),
  decision: z.string().max(40),
  resolution: z.string().max(2000),
  reviewer: z.string().max(100),
  timestamp: z.string().max(40),
});

type CaseInput = z.infer<typeof caseSchema>;

function caseText(c: CaseInput): string {
  const money = (n: number | null) => (n == null ? "n/a" : `INR ${n.toLocaleString("en-IN")}`);
  return [
    `AP exception case resolved on ${c.timestamp.slice(0, 10)}.`,
    `Vendor: ${c.vendor_name} (vendor ID ${c.vendor_code}).`,
    `Invoice ${c.invoice_number ?? "unknown"}${c.invoice_date ? ` dated ${c.invoice_date}` : ""}, PO ${c.po_number ?? "none"}.`,
    `Exception type: ${c.exception_type.replace(/_/g, " ")} — ${c.exception_title}.`,
    `PO amount ${money(c.po_amount)}, invoice amount ${money(c.invoice_amount)}, discrepancy ${money(c.discrepancy_amount)}.`,
    `Reason: ${c.discrepancy_reason}`,
    `Human decision by ${c.reviewer}: ${c.decision}.`,
    `Resolution notes: ${c.resolution}`,
  ].join("\n");
}

async function retainCase(c: CaseInput): Promise<RetainResult> {
  const retained_at = new Date().toISOString();
  const h = getHindsight();
  if (!h) return { status: "not_configured", error: NOT_CONFIGURED, retained_at };
  try {
    await h.client.retain(h.bankId, caseText(c), {
      timestamp: c.timestamp,
      context: `AP exception resolution for ${c.vendor_name}`,
      documentId: c.document_id,
      tags: [vendorTag(c.vendor_code), `type:${c.exception_type}`, `decision:${c.decision}`],
      metadata: {
        vendor_code: c.vendor_code,
        invoice_number: c.invoice_number ?? "",
        exception_type: c.exception_type,
        decision: c.decision,
      },
      async: false,
    });
    return { status: "ok", retained_at, bank: h.bankId };
  } catch (error) {
    console.error("Hindsight retain failed", error);
    return { status: "error", error: errMessage(error), retained_at };
  }
}

export const retainResolution = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => caseSchema.parse(d))
  .handler(async ({ data }) => retainCase(data));

/** Seeds a vendor's existing case history (from the ledger) into Hindsight. */
export const syncVendorHistory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.array(caseSchema).max(50).parse(d))
  .handler(async ({ data }) => {
    let ok = 0;
    let lastError: string | undefined;
    for (const c of data) {
      const r = await retainCase(c);
      if (r.status === "not_configured") return { status: r.status, ok: 0, error: r.error };
      if (r.status === "ok") ok++;
      else lastError = r.error;
    }
    return {
      status: (ok === data.length ? "ok" : ok > 0 ? "ok" : "error") as HindsightStatus,
      ok,
      error: lastError,
    };
  });
