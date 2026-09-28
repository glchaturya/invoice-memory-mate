import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, Panel } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { listInvoices } from "@/lib/ap-data";
import { inr, shortDate } from "@/lib/format";

export const Route = createFileRoute("/invoices/")({
  head: () => ({
    meta: [
      { title: "Invoices — AP Memory Agent" },
      {
        name: "description",
        content: "Every invoice in the ledger with its validation status against purchase orders.",
      },
      { property: "og:title", content: "Invoices — AP Memory Agent" },
      {
        property: "og:description",
        content: "Invoice ledger with PO validation status and exception flags.",
      },
    ],
  }),
  component: InvoicesPage,
});

const FILTERS = ["all", "valid", "needs_review", "critical", "resolved"] as const;

function InvoicesPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const { data } = useQuery({ queryKey: ["invoices"], queryFn: listInvoices });

  const rows = (data ?? []).filter((i) => filter === "all" || i.status === filter);

  return (
    <AppShell breadcrumb={["AP", "Invoices"]}>
      <div className="rise flex items-center gap-4">
        <h1 className="font-display text-[26px] leading-none font-bold tracking-tight">Invoices</h1>
        <div className="ml-auto flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-2.5 py-1.5 font-mono text-[11px] transition-colors ${
                filter === f ? "bg-ink text-paper" : "text-ink/60 hover:bg-ink/5"
              }`}
            >
              {f.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <Panel
        className="mt-4"
        title="Ledger"
        right={<span className="font-mono text-[11px] text-ink/40">{rows.length} shown</span>}
      >
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-line font-mono text-[10px] tracking-[0.1em] text-ink/40 uppercase">
              <th className="px-4 py-2 text-left font-normal">Invoice</th>
              <th className="px-4 py-2 text-left font-normal">Vendor</th>
              <th className="px-4 py-2 text-left font-normal">PO</th>
              <th className="px-4 py-2 text-right font-normal">Subtotal</th>
              <th className="px-4 py-2 text-right font-normal">Total</th>
              <th className="px-4 py-2 text-left font-normal">Due</th>
              <th className="px-4 py-2 text-left font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((inv) => (
              <tr key={inv.id} className="hover:bg-ink/[0.02]">
                <td className="px-4 py-2.5 font-mono">
                  <Link
                    to="/invoices/$invoiceId"
                    params={{ invoiceId: inv.id }}
                    className="text-brand hover:underline"
                  >
                    {inv.invoice_number}
                  </Link>
                </td>
                <td className="px-4 py-2.5">{inv.vendors?.name}</td>
                <td className="px-4 py-2.5 font-mono text-ink/55">{inv.po_number ?? "—"}</td>
                <td className="px-4 py-2.5 text-right font-mono">{inr(inv.subtotal)}</td>
                <td className="px-4 py-2.5 text-right font-mono">{inr(inv.total_amount)}</td>
                <td className="px-4 py-2.5 font-mono text-ink/55">{shortDate(inv.due_date)}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge value={inv.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink/45">
                  Nothing matches this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
