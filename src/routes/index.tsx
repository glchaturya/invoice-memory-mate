import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Panel } from "@/components/app-shell";
import { StatusBadge, EXCEPTION_LABELS } from "@/components/status-badge";
import { getDashboard } from "@/lib/ap-data";
import { inr, shortDate } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — AP Memory Agent" },
      {
        name: "description",
        content:
          "Accounts payable control tower: invoices processed, exceptions detected, pending human review and resolved cases.",
      },
      { property: "og:title", content: "Overview — AP Memory Agent" },
      {
        property: "og:description",
        content: "Invoice exception intelligence with vendor memory for AP teams.",
      },
    ],
  }),
  component: Dashboard,
});

function Kpi({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rise rounded-lg border border-line bg-card p-4">
      <p className="label-mono">{label}</p>
      <p className={`mt-2 font-display text-[28px] leading-none font-bold ${tone ?? ""}`}>
        {value}
      </p>
    </div>
  );
}

function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard });
  const stats = data?.stats;

  return (
    <AppShell breadcrumb={["AP", "Overview"]}>
      <div className="rise flex items-start gap-4">
        <div>
          <h1 className="font-display text-[26px] leading-none font-bold tracking-tight">
            Accounts payable control tower
          </h1>
          <p className="mt-2 text-[13px] text-ink/55">
            The agent reads invoices, validates them against purchase orders and vendor memory, and
            recommends. Every decision stays with a human reviewer.
          </p>
        </div>
        <Link
          to="/upload"
          className="ml-auto shrink-0 rounded-md bg-ink px-4 py-2 text-[12.5px] font-semibold text-paper transition-colors hover:bg-ink/90"
        >
          Upload invoice
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-4">
        <Kpi label="Total invoices" value={stats?.total ?? 0} />
        <Kpi label="Processed" value={stats?.processed ?? 0} />
        <Kpi label="Exceptions detected" value={stats?.exceptions ?? 0} tone="text-warn" />
        <Kpi label="Pending human review" value={stats?.pending ?? 0} tone="text-crit" />
        <Kpi label="Resolved exceptions" value={stats?.resolved ?? 0} tone="text-ok" />
      </div>

      <div className="mt-5 grid grid-cols-12 gap-4">
        <Panel
          className="col-span-8"
          title="Recent invoices"
          right={
            <Link to="/invoices" className="font-mono text-[11px] text-brand">
              View all
            </Link>
          }
        >
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-line font-mono text-[10px] tracking-[0.1em] text-ink/40 uppercase">
                <th className="px-4 py-2 text-left font-normal">Invoice</th>
                <th className="px-4 py-2 text-left font-normal">Vendor</th>
                <th className="px-4 py-2 text-right font-normal">Amount</th>
                <th className="px-4 py-2 text-left font-normal">Due</th>
                <th className="px-4 py-2 text-left font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(data?.invoices ?? []).slice(0, 8).map((inv) => (
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
                  <td className="px-4 py-2.5 text-right font-mono">{inr(inv.total_amount)}</td>
                  <td className="px-4 py-2.5 font-mono text-ink/55">{shortDate(inv.due_date)}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge value={inv.status} />
                  </td>
                </tr>
              ))}
              {!isLoading && (data?.invoices.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink/45">
                    No invoices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>

        <Panel className="col-span-4" title="Open exceptions">
          <div className="divide-y divide-line">
            {(data?.exceptions ?? [])
              .filter((e) => e.status === "open")
              .slice(0, 6)
              .map((ex) => (
                <Link
                  key={ex.id}
                  to="/invoices/$invoiceId"
                  params={{ invoiceId: ex.invoice_id }}
                  className="block px-4 py-3 hover:bg-ink/[0.02]"
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge value={ex.severity} />
                    <span className="font-mono text-[11px] text-ink/45">
                      {EXCEPTION_LABELS[ex.exception_type] ?? ex.exception_type}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] font-medium">{ex.title}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink/45">
                    {ex.invoices?.invoice_number} · {ex.vendors?.name}
                  </p>
                </Link>
              ))}
            {(data?.exceptions ?? []).filter((e) => e.status === "open").length === 0 && (
              <p className="px-4 py-6 text-center text-[12.5px] text-ink/45">
                No exceptions waiting for review.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
