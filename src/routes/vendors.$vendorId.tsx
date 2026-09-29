import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, Field, Panel } from "@/components/app-shell";
import { EXCEPTION_LABELS, StatusBadge } from "@/components/status-badge";
import { getVendorDetail } from "@/lib/ap-data";
import { hindsightConfig, syncVendorHistory } from "@/lib/hindsight.functions";
import { inr, shortDate } from "@/lib/format";

export const Route = createFileRoute("/vendors/$vendorId")({
  head: () => ({
    meta: [
      { title: "Vendor profile — AP Memory Agent" },
      { name: "description", content: "Payment terms, invoices, exceptions, resolutions and memory for one vendor." },
      { property: "og:title", content: "Vendor profile — AP Memory Agent" },
      { property: "og:description", content: "Everything the agent remembers about this vendor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorPage,
});

function VendorPage() {
  const { vendorId } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["vendor", vendorId],
    queryFn: () => getVendorDetail(vendorId),
  });
  const cfg = useQuery({ queryKey: ["hindsight-config"], queryFn: () => hindsightConfig() });

  const sync = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("Vendor not loaded");
      const v = data.vendor;
      return syncVendorHistory({
        data: data.memory.map((m) => ({
          document_id: `ledger-case-${m.id}`,
          vendor_name: v.name,
          vendor_code: v.vendor_code,
          invoice_number: m.invoice_number,
          po_number: null,
          invoice_date: m.occurred_on,
          exception_type: m.case_type,
          exception_title: m.title,
          po_amount: null,
          invoice_amount: null,
          discrepancy_amount: m.amount_delta == null ? null : Number(m.amount_delta),
          discrepancy_reason: m.summary ?? m.title,
          decision: m.outcome,
          resolution: m.resolution ?? "",
          reviewer: "AP team",
          timestamp: m.occurred_on ? new Date(m.occurred_on).toISOString() : new Date().toISOString(),
        })),
      });
    },
    onSuccess: (r) =>
      r.status === "ok"
        ? toast.success(`${r.ok} case(s) retained in Hindsight`)
        : toast.error(r.error ?? "Hindsight sync failed"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading)
    return (
      <AppShell breadcrumb={["AP", "Vendor memory", "…"]}>
        <p className="text-ink/50">Loading vendor…</p>
      </AppShell>
    );
  if (error || !data)
    return (
      <AppShell breadcrumb={["AP", "Vendor memory", "Not found"]}>
        <p className="text-ink/60">This vendor could not be found.</p>
        <Link to="/vendors" className="mt-2 inline-block text-brand">Back to vendors</Link>
      </AppShell>
    );

  const { vendor, invoices, memory, exceptions, resolutions, purchaseOrders } = data;

  return (
    <AppShell breadcrumb={["AP", "Vendor memory", vendor.name]}>
      <div className="rise flex items-center gap-3">
        <h1 className="font-display text-[26px] leading-none font-bold tracking-tight">{vendor.name}</h1>
        <span className="font-mono text-[12px] text-ink/45">{vendor.vendor_code}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <Panel title="Profile">
          <dl className="space-y-2 p-4">
            <Field label="Normal terms" value={vendor.standard_payment_terms} />
            <Field label="City" value={vendor.city} />
            <Field label="Credit limit" value={inr(vendor.credit_limit ?? 0, false)} />
            <Field label="Purchase orders" value={purchaseOrders.length} />
          </dl>
        </Panel>
        <Panel title="Common discrepancy patterns">
          <ul className="space-y-1 p-4 text-[12.5px] text-ink/70">
            {vendor.common_patterns.map((p) => <li key={p}>· {p}</li>)}
          </ul>
        </Panel>
        <Panel title="Hindsight memory">
          <div className="space-y-2 p-4 text-[12.5px]">
            {cfg.data?.configured ? (
              <p className="text-ok">Connected · bank “{cfg.data.bank}”</p>
            ) : (
              <p className="text-ink/60">Not configured — add HINDSIGHT_API_URL and HINDSIGHT_API_KEY server secrets.</p>
            )}
            <button
              disabled={!cfg.data?.configured || sync.isPending || memory.length === 0}
              onClick={() => sync.mutate()}
              className="rounded-md bg-brand px-3 py-1.5 font-medium text-primary-foreground disabled:opacity-40"
            >
              {sync.isPending ? "Retaining…" : `Retain ${memory.length} ledger cases`}
            </button>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Panel title={`Case history (${memory.length})`}>
          <div className="divide-y divide-line">
            {memory.map((m) => (
              <div key={m.id} className="p-4 text-[12.5px]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-ink/50">{m.invoice_number}</span>
                  <span className="font-medium">{m.title}</span>
                  <StatusBadge value={m.outcome} className="ml-auto" />
                </div>
                <p className="mt-1 text-ink/60">{m.summary}</p>
                {m.resolution && <p className="mt-1 text-ink/75">→ {m.resolution}</p>}
                <p className="mt-1 font-mono text-[10.5px] text-ink/40">
                  {shortDate(m.occurred_on)}{m.amount_delta != null && ` · Δ ${inr(m.amount_delta)}`}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title={`Invoices (${invoices.length})`}>
            <div className="divide-y divide-line">
              {invoices.map((i) => (
                <Link key={i.id} to="/invoices/$invoiceId" params={{ invoiceId: i.id }} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px] hover:bg-ink/[0.03]">
                  <span className="font-mono">{i.invoice_number}</span>
                  <span className="text-ink/45">{shortDate(i.invoice_date)}</span>
                  <span className="ml-auto font-mono">{inr(i.total_amount)}</span>
                  <StatusBadge value={i.status} />
                </Link>
              ))}
            </div>
          </Panel>
          <Panel title={`Exceptions (${exceptions.length})`}>
            <div className="divide-y divide-line">
              {exceptions.map((e) => (
                <Link key={e.id} to="/invoices/$invoiceId" params={{ invoiceId: e.invoice_id }} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px] hover:bg-ink/[0.03]">
                  <span className="font-mono text-ink/50">{e.invoices?.invoice_number}</span>
                  <span>{EXCEPTION_LABELS[e.exception_type] ?? e.exception_type}</span>
                  <StatusBadge value={e.status} className="ml-auto" />
                </Link>
              ))}
            </div>
          </Panel>
          <Panel title="Approval history">
            <div className="divide-y divide-line">
              {resolutions.length === 0 && <p className="p-4 text-[12.5px] text-ink/45">No decisions yet.</p>}
              {resolutions.map((r) => (
                <div key={r.id} className="px-4 py-2.5 text-[12.5px]">
                  <div className="flex items-center gap-2">
                    <StatusBadge value={r.action} />
                    <span className="text-ink/60">by {r.resolved_by}</span>
                    <span className="ml-auto font-mono text-[10.5px] text-ink/40">{shortDate(r.created_at)}</span>
                  </div>
                  {r.notes && <p className="mt-1 text-ink/65">{r.notes}</p>}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
