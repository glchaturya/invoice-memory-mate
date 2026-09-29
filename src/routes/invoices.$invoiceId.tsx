import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Field, Panel } from "@/components/app-shell";
import { EXCEPTION_LABELS, StatusBadge } from "@/components/status-badge";
import { decideException, getInvoiceDetail } from "@/lib/ap-data";
import type { ExceptionRow } from "@/lib/ap-types";
import type { RetainResult } from "@/lib/hindsight.functions";
import { inr, shortDate } from "@/lib/format";

export const Route = createFileRoute("/invoices/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Invoice review — AP Memory Agent" },
      {
        name: "description",
        content: "Invoice, PO and vendor details with detected exceptions, recalled memory and the agent's recommendation.",
      },
      { property: "og:title", content: "Invoice review — AP Memory Agent" },
      { property: "og:description", content: "Human-in-the-loop review of an invoice exception." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvoicePage,
});

function InvoicePage() {
  const { invoiceId } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getInvoiceDetail(invoiceId),
  });

  if (isLoading)
    return (
      <AppShell breadcrumb={["AP", "Invoices", "…"]}>
        <p className="text-ink/50">Loading invoice…</p>
      </AppShell>
    );
  if (error || !data)
    return (
      <AppShell breadcrumb={["AP", "Invoices", "Not found"]}>
        <p className="text-ink/60">This invoice could not be found.</p>
        <Link to="/invoices" className="mt-2 inline-block text-brand">Back to invoices</Link>
      </AppShell>
    );

  const { invoice, vendor, po, lineItems, exceptions, similarCases } = data;
  const delta = po ? Number(invoice.subtotal) - Number(po.po_amount) : null;

  return (
    <AppShell breadcrumb={["AP", "Invoices", invoice.invoice_number]}>
      <div className="rise flex items-center gap-3">
        <h1 className="font-display text-[26px] leading-none font-bold tracking-tight">
          {invoice.invoice_number}
        </h1>
        <StatusBadge value={invoice.status} />
        <Link
          to="/vendors/$vendorId"
          params={{ vendorId: vendor.id }}
          className="ml-auto font-mono text-[11px] text-brand"
        >
          {vendor.name} · {vendor.vendor_code} →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_380px] gap-4">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Panel title="Invoice">
              <dl className="space-y-2 p-4">
                <Field label="Date" value={shortDate(invoice.invoice_date)} />
                <Field label="Due" value={shortDate(invoice.due_date)} />
                <Field label="Terms" value={invoice.payment_terms} />
                <Field label="Subtotal" value={inr(invoice.subtotal)} />
                <Field label="GST" value={inr(invoice.tax_amount)} />
                <Field label="Total" value={inr(invoice.total_amount)} />
              </dl>
            </Panel>
            <Panel title="Vendor">
              <dl className="space-y-2 p-4">
                <Field label="Name" value={vendor.name} />
                <Field label="ID" value={vendor.vendor_code} />
                <Field label="City" value={vendor.city} />
                <Field label="Std terms" value={vendor.standard_payment_terms} />
              </dl>
            </Panel>
            <Panel title="Purchase order">
              <dl className="space-y-2 p-4">
                <Field label="PO" value={po?.po_number ?? invoice.po_number} />
                <Field label="PO amount" value={po ? inr(po.po_amount) : "—"} />
                <Field label="Approved by" value={po?.approved_by} />
                <Field
                  label="Difference"
                  value={
                    delta == null ? "—" : (
                      <span className={delta !== 0 ? "text-crit" : ""}>{inr(delta)}</span>
                    )
                  }
                />
              </dl>
            </Panel>
          </div>

          <Panel title="Line items">
            <table className="w-full text-[12.5px]">
              <tbody>
                {lineItems.map((li) => (
                  <tr key={li.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2">{li.description}</td>
                    <td className="px-4 py-2 text-right font-mono text-ink/50">
                      {li.quantity} × {inr(li.unit_price)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{inr(li.amount)}</td>
                  </tr>
                ))}
                {lineItems.length === 0 && (
                  <tr>
                    <td className="px-4 py-3 text-ink/45">No line items recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>

          <Panel title="Similar cases in the local ledger">
            <div className="divide-y divide-line">
              {similarCases.length === 0 && (
                <p className="p-4 text-[12.5px] text-ink/45">No matching ledger cases.</p>
              )}
              {similarCases.map((c) => (
                <div key={c.id} className="p-4 text-[12.5px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-ink/50">{c.invoice_number}</span>
                    <span className="font-medium">{c.title}</span>
                    <StatusBadge value={c.outcome} className="ml-auto" />
                  </div>
                  <p className="mt-1 text-ink/60">{c.resolution}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="rail space-y-4">
          {exceptions.length === 0 ? (
            <Panel title="Validation">
              <p className="p-4 text-[13px] text-ok">
                Invoice matches the PO and vendor terms. No exceptions detected.
              </p>
            </Panel>
          ) : (
            exceptions.map((ex) => <ExceptionCard key={ex.id} exception={ex} invoiceId={invoice.id} />)
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ExceptionCard({ exception, invoiceId }: { exception: ExceptionRow; invoiceId: string }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [retained, setRetained] = useState<RetainResult | null>(null);
  const rec = exception.ai_recommendation;
  const hs = rec?.hindsight;

  const decide = useMutation({
    mutationFn: (action: "approve" | "reject" | "resolve") =>
      decideException({ exception, action, notes }),
    onSuccess: async (res) => {
      setRetained(res.retained);
      toast.success(`Exception ${res.status}`);
      await queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel
      title={EXCEPTION_LABELS[exception.exception_type] ?? exception.exception_type}
      right={
        <div className="flex gap-1.5">
          <StatusBadge value={exception.severity} />
          <StatusBadge value={exception.status} />
        </div>
      }
    >
      <div className="space-y-4 p-4 text-[12.5px]">
        <section>
          <p className="label-mono">1 · Current exception</p>
          <p className="mt-1 font-medium">{exception.title}</p>
          <p className="mt-0.5 text-ink/60">{exception.detail}</p>
          {exception.amount_delta != null && (
            <p className="mt-1 font-mono text-crit">Δ {inr(exception.amount_delta)}</p>
          )}
        </section>

        <section>
          <p className="label-mono">2 · Recalled from Hindsight memory</p>
          {!hs && <p className="mt-1 text-ink/45">No recall recorded for this exception.</p>}
          {hs?.status === "not_configured" && (
            <p className="mt-1 rounded-md bg-warn/10 p-2 text-ink/70">
              Hindsight not configured — no memory was recalled. {hs.error}
            </p>
          )}
          {hs?.status === "error" && (
            <p className="mt-1 rounded-md bg-crit/10 p-2 text-ink/70">Recall failed: {hs.error}</p>
          )}
          {hs?.status === "ok" && hs.memories.length === 0 && (
            <p className="mt-1 text-ink/45">Hindsight returned no memories for this vendor.</p>
          )}
          {hs?.status === "ok" && hs.memories.length > 0 && (
            <ul className="mt-1.5 space-y-1.5">
              {hs.memories.map((m) => (
                <li key={m.id} className="rounded-md border border-line p-2 text-ink/75">
                  {m.text}
                  {m.occurred && (
                    <span className="ml-1 font-mono text-[10px] text-ink/40">{shortDate(m.occurred)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {rec && (
          <section>
            <p className="label-mono">
              3 · Recommendation <span className="text-ink/35">({rec.source === "ai" ? "AI" : "rules"} · {rec.confidence})</span>
            </p>
            <p className="mt-1 font-display text-[14px] font-semibold">{rec.headline}</p>
            <p className="mt-1 text-ink/65"><b>What's wrong:</b> {rec.what_is_wrong}</p>
            <p className="mt-1 text-ink/65"><b>History:</b> {rec.historical_pattern}</p>
            <p className="mt-1 text-ink/65"><b>Next step:</b> {rec.recommended_next_step}</p>
            {rec.memory_used?.length > 0 && (
              <p className="mt-1 font-mono text-[10.5px] text-ink/45">Memory used: {rec.memory_used.join(", ")}</p>
            )}
          </section>
        )}

        <section>
          <p className="label-mono">4 · Human decision</p>
          {exception.status === "open" ? (
            <>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Resolution notes (saved to vendor memory)"
                className="mt-1.5 h-20 w-full rounded-md border border-line bg-paper p-2 text-[12.5px]"
              />
              <div className="mt-2 flex gap-2">
                <button disabled={decide.isPending} onClick={() => decide.mutate("approve")} className="rounded-md bg-ok px-3 py-1.5 font-medium text-primary-foreground disabled:opacity-50">Approve</button>
                <button disabled={decide.isPending} onClick={() => decide.mutate("resolve")} className="rounded-md bg-brand px-3 py-1.5 font-medium text-primary-foreground disabled:opacity-50">Resolve</button>
                <button disabled={decide.isPending} onClick={() => decide.mutate("reject")} className="rounded-md bg-crit px-3 py-1.5 font-medium text-primary-foreground disabled:opacity-50">Reject</button>
              </div>
            </>
          ) : (
            <p className="mt-1 text-ink/60">Decided: <StatusBadge value={exception.status} /></p>
          )}
        </section>

        {retained && (
          <section data-invoice={invoiceId}>
            <p className="label-mono">5 · Memory</p>
            {retained.status === "ok" ? (
              <p className="mt-1 rounded-md bg-ok/10 p-2 text-ok">Case retained in Hindsight bank “{retained.bank}”.</p>
            ) : (
              <p className="mt-1 rounded-md bg-warn/10 p-2 text-ink/70">
                Saved to the local ledger, but not retained in Hindsight: {retained.error}
              </p>
            )}
          </section>
        )}
      </div>
    </Panel>
  );
}
