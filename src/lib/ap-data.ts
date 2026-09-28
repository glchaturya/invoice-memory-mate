import { supabase } from "@/integrations/supabase/client";
import { analyseException } from "./ai.functions";
import {
  detectExceptions,
  findSimilarCases,
  ruleBasedRecommendation,
  severityRank,
} from "./ap-engine";
import type {
  ExceptionRow,
  ExtractedInvoice,
  Invoice,
  MemoryCase,
  PurchaseOrder,
  Recommendation,
  ResolutionRow,
  Vendor,
} from "./ap-types";

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function listVendors(): Promise<Vendor[]> {
  return must(await supabase.from("vendors").select("*").order("name")) as Vendor[];
}

export async function listInvoices(): Promise<(Invoice & { vendors: Vendor })[]> {
  return must(
    await supabase
      .from("invoices")
      .select("*, vendors(*)")
      .order("created_at", { ascending: false }),
  ) as (Invoice & { vendors: Vendor })[];
}

export async function listExceptions(): Promise<
  (ExceptionRow & { invoices: Invoice; vendors: Vendor })[]
> {
  return must(
    await supabase
      .from("exceptions")
      .select("*, invoices(*), vendors(*)")
      .order("created_at", { ascending: false }),
  ) as never;
}

export async function getDashboard() {
  const [invoices, exceptions] = await Promise.all([listInvoices(), listExceptions()]);
  const resolvedStatuses = new Set(["resolved", "approved", "rejected"]);
  return {
    invoices,
    exceptions,
    stats: {
      total: invoices.length,
      processed: invoices.filter((i) => i.status !== "pending").length,
      exceptions: exceptions.length,
      pending: exceptions.filter((e) => e.status === "open").length,
      resolved: exceptions.filter((e) => resolvedStatuses.has(e.status)).length,
    },
  };
}

export async function getInvoiceDetail(id: string) {
  const invoice = must(
    await supabase.from("invoices").select("*, vendors(*)").eq("id", id).single(),
  ) as Invoice & { vendors: Vendor };
  const [lineItems, exceptions, po, memory] = await Promise.all([
    supabase.from("invoice_line_items").select("*").eq("invoice_id", id),
    supabase
      .from("exceptions")
      .select("*")
      .eq("invoice_id", id)
      .order("created_at", { ascending: true }),
    invoice.po_id
      ? supabase.from("purchase_orders").select("*").eq("id", invoice.po_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("vendor_memory_cases").select("*").eq("vendor_id", invoice.vendor_id),
  ]);

  const exceptionRows = (exceptions.data ?? []) as ExceptionRow[];
  const memoryCases = (memory.data ?? []) as MemoryCase[];

  return {
    invoice,
    vendor: invoice.vendors,
    lineItems: (lineItems.data ?? []) as {
      id: string;
      description: string;
      quantity: number;
      unit_price: number;
      amount: number;
    }[],
    exceptions: exceptionRows,
    po: (po.data ?? null) as PurchaseOrder | null,
    similarCases: findSimilarCases(
      memoryCases,
      exceptionRows.map((e) => ({
        exception_type: e.exception_type,
        severity: e.severity,
        title: e.title,
        detail: e.detail ?? "",
        amount_delta: e.amount_delta,
      })),
      4,
    ),
  };
}

export async function getVendorDetail(id: string) {
  const vendor = must(
    await supabase.from("vendors").select("*").eq("id", id).single(),
  ) as Vendor;
  const [invoices, memory, exceptions, resolutions, pos] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .eq("vendor_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("vendor_memory_cases")
      .select("*")
      .eq("vendor_id", id)
      .order("occurred_on", { ascending: false }),
    supabase
      .from("exceptions")
      .select("*, invoices(invoice_number)")
      .eq("vendor_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("resolutions")
      .select("*")
      .eq("vendor_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("purchase_orders").select("*").eq("vendor_id", id),
  ]);

  return {
    vendor,
    invoices: (invoices.data ?? []) as Invoice[],
    memory: (memory.data ?? []) as MemoryCase[],
    exceptions: (exceptions.data ?? []) as (ExceptionRow & {
      invoices: { invoice_number: string } | null;
    })[],
    resolutions: (resolutions.data ?? []) as ResolutionRow[],
    purchaseOrders: (pos.data ?? []) as PurchaseOrder[],
  };
}

/** Full ingestion pipeline: extract -> validate -> detect -> recall -> reason. */
export async function processInvoice(extracted: ExtractedInvoice, fileName: string) {
  // 1. Vendor
  let vendor = (
    await supabase
      .from("vendors")
      .select("*")
      .or(
        `vendor_code.eq.${extracted.vendor_code ?? "__none__"},name.eq.${extracted.vendor_name}`,
      )
      .maybeSingle()
  ).data as Vendor | null;

  if (!vendor) {
    vendor = must(
      await supabase
        .from("vendors")
        .insert({
          vendor_code: extracted.vendor_code ?? `V-${Date.now().toString().slice(-4)}`,
          name: extracted.vendor_name || "Unknown vendor",
          standard_payment_terms: extracted.payment_terms ?? "Net 30",
        })
        .select()
        .single(),
    ) as Vendor;
  }

  // 2. Purchase order
  const po = extracted.po_number
    ? ((
        await supabase
          .from("purchase_orders")
          .select("*")
          .eq("po_number", extracted.po_number)
          .maybeSingle()
      ).data as PurchaseOrder | null)
    : null;

  // 3. Duplicate check
  const existing = (
    await supabase
      .from("invoices")
      .select("id")
      .eq("vendor_id", vendor.id)
      .eq("invoice_number", extracted.invoice_number)
      .limit(1)
  ).data as { id: string }[] | null;
  const duplicateOf = existing && existing.length > 0 ? existing[0].id : null;

  // 4. Store the invoice
  const invoice = must(
    await supabase
      .from("invoices")
      .insert({
        invoice_number: extracted.invoice_number,
        vendor_id: vendor.id,
        po_id: po?.id ?? null,
        po_number: extracted.po_number,
        invoice_date: extracted.invoice_date,
        due_date: extracted.due_date,
        subtotal: extracted.subtotal,
        tax_amount: extracted.tax_amount,
        total_amount: extracted.total_amount,
        payment_terms: extracted.payment_terms,
        status: "pending",
        source: "upload",
        file_name: fileName,
      })
      .select()
      .single(),
  ) as Invoice;

  if (extracted.line_items.length > 0) {
    await supabase.from("invoice_line_items").insert(
      extracted.line_items.map((li) => ({
        invoice_id: invoice.id,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        amount: li.amount,
      })),
    );
  }

  // 5. Validate + detect
  const detected = detectExceptions({ extracted, vendor, po, duplicateOf });

  if (detected.length === 0) {
    await supabase.from("invoices").update({ status: "valid" }).eq("id", invoice.id);
    return { invoiceId: invoice.id, exceptionCount: 0 };
  }

  // 6. Recall vendor memory
  const memoryCases = ((
    await supabase.from("vendor_memory_cases").select("*").eq("vendor_id", vendor.id)
  ).data ?? []) as MemoryCase[];

  const ordered = [...detected].sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity),
  );

  // 7. Reason over the primary exception with the AI layer
  const rows = [];
  for (const [index, ex] of ordered.entries()) {
    const similar = findSimilarCases(memoryCases, [ex], 4);
    let recommendation: Recommendation = ruleBasedRecommendation(ex, similar);

    if (index === 0) {
      try {
        const ai = await analyseException({
          data: {
            vendor: {
              name: vendor.name,
              code: vendor.vendor_code,
              standard_payment_terms: vendor.standard_payment_terms,
              common_patterns: vendor.common_patterns,
            },
            invoice: {
              invoice_number: extracted.invoice_number,
              invoice_date: extracted.invoice_date,
              due_date: extracted.due_date,
              po_number: extracted.po_number,
              subtotal: extracted.subtotal,
              tax_amount: extracted.tax_amount,
              total_amount: extracted.total_amount,
              payment_terms: extracted.payment_terms,
              line_items: extracted.line_items.map((li) => ({
                description: li.description,
                amount: li.amount,
              })),
            },
            po: po ? { po_number: po.po_number, po_amount: Number(po.po_amount) } : null,
            exception: {
              exception_type: ex.exception_type,
              severity: ex.severity,
              title: ex.title,
              detail: ex.detail,
            },
            similar_cases: similar.map((c) => ({
              invoice_number: c.invoice_number,
              title: c.title,
              summary: c.summary,
              amount_delta: c.amount_delta,
              resolution: c.resolution,
              outcome: c.outcome,
              occurred_on: c.occurred_on,
            })),
          },
        });
        if (ai) {
          recommendation = {
            ...ai,
            memory_used: ai.memory_used?.length
              ? ai.memory_used
              : similar.map((c) => c.invoice_number ?? c.title),
            source: "ai",
          };
        }
      } catch (error) {
        console.error("AI layer unavailable, using rules", error);
      }
    }

    rows.push({
      invoice_id: invoice.id,
      vendor_id: vendor.id,
      exception_type: ex.exception_type,
      severity: ex.severity,
      title: ex.title,
      detail: ex.detail,
      amount_delta: ex.amount_delta,
      status: "open",
      ai_recommendation: recommendation as unknown as Record<string, unknown>,
    });
  }

  await supabase.from("exceptions").insert(rows);

  const critical = ordered.some(
    (e) => e.exception_type === "duplicate" || e.severity === "high",
  );
  await supabase
    .from("invoices")
    .update({ status: critical ? "critical" : "needs_review" })
    .eq("id", invoice.id);

  return { invoiceId: invoice.id, exceptionCount: ordered.length };
}

/** Human decision. Writes the outcome back into the vendor's memory. */
export async function decideException(input: {
  exception: ExceptionRow;
  action: "approve" | "reject" | "resolve";
  notes: string;
  reviewer?: string;
}) {
  const { exception, action, notes } = input;
  const reviewer = input.reviewer?.trim() || "AP Reviewer";
  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "resolved";

  await supabase.from("exceptions").update({ status }).eq("id", exception.id);

  await supabase.from("resolutions").insert({
    exception_id: exception.id,
    invoice_id: exception.invoice_id,
    vendor_id: exception.vendor_id,
    action: status,
    resolved_by: reviewer,
    notes,
  });

  const invoice = (
    await supabase
      .from("invoices")
      .select("invoice_number")
      .eq("id", exception.invoice_id)
      .single()
  ).data as { invoice_number: string } | null;

  await supabase.from("vendor_memory_cases").insert({
    vendor_id: exception.vendor_id,
    invoice_number: invoice?.invoice_number ?? null,
    case_type: exception.exception_type,
    title: exception.title,
    summary: exception.detail,
    amount_delta: exception.amount_delta,
    resolution: notes || `Marked ${status} by ${reviewer}.`,
    outcome: status,
    occurred_on: new Date().toISOString().slice(0, 10),
    tags: [exception.exception_type, action],
  });

  const remaining = (
    await supabase
      .from("exceptions")
      .select("id")
      .eq("invoice_id", exception.invoice_id)
      .eq("status", "open")
  ).data as { id: string }[] | null;

  await supabase
    .from("invoices")
    .update({
      status: remaining && remaining.length > 0 ? "needs_review" : status,
    })
    .eq("id", exception.invoice_id);

  return { status };
}
