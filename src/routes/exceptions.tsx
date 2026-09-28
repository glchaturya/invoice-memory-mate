import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Panel } from "@/components/app-shell";
import { EXCEPTION_LABELS, StatusBadge } from "@/components/status-badge";
import { listExceptions } from "@/lib/ap-data";
import { inr, shortDate } from "@/lib/format";

export const Route = createFileRoute("/exceptions")({
  head: () => ({
    meta: [
      { title: "Exception queue — AP Memory Agent" },
      {
        name: "description",
        content: "Every detected invoice exception with severity and its human review status.",
      },
      { property: "og:title", content: "Exception queue — AP Memory Agent" },
      {
        property: "og:description",
        content: "PO mismatches, duplicates and payment-term issues awaiting AP review.",
      },
    ],
  }),
  component: ExceptionsPage,
});

function ExceptionsPage() {
  const { data } = useQuery({ queryKey: ["exceptions"], queryFn: listExceptions });
  const rows = data ?? [];

  return (
    <AppShell breadcrumb={["AP", "Exceptions"]}>
      <h1 className="rise font-display text-[26px] leading-none font-bold tracking-tight">
        Exception queue
      </h1>
      <p className="mt-2 text-[13px] text-ink/55">
        Detected by deterministic validation rules, explained by the agent, decided by a human.
      </p>

      <Panel
        className="mt-4"
        title="All exceptions"
        right={<span className="font-mono text-[11px] text-ink/40">{rows.length} total</span>}
      >
        <div className="divide-y divide-line">
          {rows.map((ex) => (
            <Link
              key={ex.id}
              to="/invoices/$invoiceId"
              params={{ invoiceId: ex.invoice_id }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-ink/[0.02]"
            >
              <StatusBadge value={ex.severity} />
              <div className="min-w-0">
                <p className="text-[13px] font-medium">{ex.title}</p>
                <p className="mt-0.5 font-mono text-[11px] text-ink/45">
                  {EXCEPTION_LABELS[ex.exception_type] ?? ex.exception_type} ·{" "}
                  {ex.invoices?.invoice_number} · {ex.vendors?.name} · {shortDate(ex.created_at)}
                </p>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-3">
                {ex.amount_delta ? (
                  <span className="font-mono text-[12px] text-crit">
                    {inr(ex.amount_delta)}
                  </span>
                ) : null}
                <StatusBadge value={ex.status} />
              </div>
            </Link>
          ))}
          {rows.length === 0 && (
            <p className="px-4 py-8 text-center text-[12.5px] text-ink/45">
              No exceptions recorded yet.
            </p>
          )}
        </div>
      </Panel>
    </AppShell>
  );
}
