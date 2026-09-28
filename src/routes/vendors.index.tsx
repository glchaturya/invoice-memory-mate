import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Panel } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import type { Vendor } from "@/lib/ap-types";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/vendors/")({
  head: () => ({
    meta: [
      { title: "Vendor memory — AP Memory Agent" },
      {
        name: "description",
        content:
          "Every vendor's payment terms, past exceptions, resolutions and recurring discrepancy patterns.",
      },
      { property: "og:title", content: "Vendor memory — AP Memory Agent" },
      {
        property: "og:description",
        content: "What the agent remembers about each vendor's invoicing behaviour.",
      },
    ],
  }),
  component: VendorsPage,
});

async function vendorsWithCounts() {
  const [vendors, memory, exceptions] = await Promise.all([
    supabase.from("vendors").select("*").order("name"),
    supabase.from("vendor_memory_cases").select("vendor_id"),
    supabase.from("exceptions").select("vendor_id, status"),
  ]);
  const mem = (memory.data ?? []) as { vendor_id: string }[];
  const exc = (exceptions.data ?? []) as { vendor_id: string; status: string }[];
  return ((vendors.data ?? []) as Vendor[]).map((v) => ({
    ...v,
    cases: mem.filter((m) => m.vendor_id === v.id).length,
    openExceptions: exc.filter((e) => e.vendor_id === v.id && e.status === "open").length,
  }));
}

function VendorsPage() {
  const { data } = useQuery({ queryKey: ["vendors-overview"], queryFn: vendorsWithCounts });

  return (
    <AppShell breadcrumb={["AP", "Vendor memory"]}>
      <h1 className="rise font-display text-[26px] leading-none font-bold tracking-tight">
        Vendor memory
      </h1>
      <p className="mt-2 max-w-[75ch] text-[13px] text-ink/55">
        Each vendor carries its own case history. When a new exception appears, the agent retrieves
        the matching cases from here before recommending anything.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4">
        {(data ?? []).map((v) => (
          <Link key={v.id} to="/vendors/$vendorId" params={{ vendorId: v.id }}>
            <Panel
              title={v.name}
              right={<span className="font-mono text-[11px] text-ink/40">{v.vendor_code}</span>}
              className="h-full transition-colors hover:border-brand/40"
            >
              <div className="space-y-3 p-4">
                <div className="flex gap-6 text-[12.5px]">
                  <span className="text-ink/50">
                    Terms <span className="ml-1 font-mono text-ink">{v.standard_payment_terms}</span>
                  </span>
                  <span className="text-ink/50">
                    Credit{" "}
                    <span className="ml-1 font-mono text-ink">{inr(v.credit_limit ?? 0, false)}</span>
                  </span>
                  <span className="text-ink/50">
                    Cases <span className="ml-1 font-mono text-ink">{v.cases}</span>
                  </span>
                  <span className="text-ink/50">
                    Open{" "}
                    <span className={`ml-1 font-mono ${v.openExceptions ? "text-crit" : "text-ink"}`}>
                      {v.openExceptions}
                    </span>
                  </span>
                </div>
                <div>
                  <p className="label-mono">Common discrepancy patterns</p>
                  <ul className="mt-1.5 space-y-1 text-[12.5px] text-ink/70">
                    {v.common_patterns.map((p) => (
                      <li key={p}>· {p}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Panel>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
