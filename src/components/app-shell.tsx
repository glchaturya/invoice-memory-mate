import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

async function navCounts() {
  const [invoices, openExceptions, vendors] = await Promise.all([
    supabase.from("invoices").select("id", { count: "exact", head: true }),
    supabase
      .from("exceptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase.from("vendors").select("id", { count: "exact", head: true }),
  ]);
  return {
    invoices: invoices.count ?? 0,
    exceptions: openExceptions.count ?? 0,
    vendors: vendors.count ?? 0,
  };
}

const activeClass = "bg-ink/[0.06] text-ink font-semibold";
const idleClass = "text-ink/70 hover:bg-ink/5";

export function AppShell({
  breadcrumb,
  children,
}: {
  breadcrumb: string[];
  children: ReactNode;
}) {
  const { data } = useQuery({ queryKey: ["nav-counts"], queryFn: navCounts });

  const items: {
    to: string;
    label: string;
    count?: number | undefined;
    tone?: string | undefined;
  }[] = [
    { to: "/", label: "Overview" },
    { to: "/invoices", label: "Invoices", count: data?.invoices },
    { to: "/exceptions", label: "Exceptions", count: data?.exceptions, tone: "text-crit" },
    { to: "/vendors", label: "Vendor memory", count: data?.vendors },
    { to: "/upload", label: "Upload invoice" },
  ];

  return (
    <div className="flex min-h-screen bg-paper text-sm text-ink">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-line bg-panel/60">
        <div className="border-b border-line px-5 pt-5 pb-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid size-7 place-items-center rounded-md bg-brand font-display text-sm font-bold text-primary-foreground">
              A
            </div>
            <div>
              <p className="font-display text-[15px] leading-none font-bold tracking-tight">
                AP Memory
              </p>
              <p className="mt-1 font-mono text-[10px] text-ink/45">AGENT · v1.0</p>
            </div>
          </Link>
        </div>

        <nav className="space-y-0.5 px-3 py-4 text-[13px] font-medium">
          <p className="label-mono px-2.5 pb-2">Workspace</p>
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className={`flex items-center justify-between rounded-md px-2.5 py-2 ${idleClass}`}
              activeProps={{ className: `flex items-center justify-between rounded-md px-2.5 py-2 ${activeClass}` }}
            >
              {item.label}
              {typeof item.count === "number" && (
                <span className={`font-mono text-[10px] ${item.tone ?? "text-ink/35"}`}>
                  {item.count}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-line p-3">
          <div className="rounded-lg bg-ink p-3 text-paper">
            <p className="font-mono text-[10px] text-paper/50">REASONING LAYER</p>
            <p className="mt-1 font-display text-[13px] font-semibold">LLM · connected</p>
            <p className="mt-0.5 font-mono text-[10px] text-paper/40">memory-db · enabled</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-line bg-paper/90 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink/45">
            {breadcrumb.map((crumb, i) => (
              <span key={`${crumb}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <span>/</span>}
                <span className={i === breadcrumb.length - 1 ? "font-medium text-ink" : ""}>
                  {crumb}
                </span>
              </span>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="px-1 font-mono text-[11px] text-ink/40">FY 2026-27</span>
            <div className="grid size-7 place-items-center rounded-md bg-brand/10 font-display text-[12px] font-semibold text-brand">
              RK
            </div>
          </div>
        </header>
        <main className="px-6 py-5">{children}</main>
      </div>
    </div>
  );
}

export function Panel({
  title,
  right,
  children,
  className,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-line bg-card ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="font-display text-[14px] font-semibold">{title}</p>
        {right}
      </div>
      {children}
    </div>
  );
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-[12.5px]">
      <dt className="text-ink/50">{label}</dt>
      <dd className="text-right font-mono">{value ?? "—"}</dd>
    </div>
  );
}
