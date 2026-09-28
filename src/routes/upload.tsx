import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel } from "@/components/app-shell";
import { processInvoice } from "@/lib/ap-data";
import { DEMO_SCENARIOS, scenarioForFile, type DemoScenario } from "@/lib/demo-scenarios";
import type { ExtractedInvoice } from "@/lib/ap-types";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload invoice — AP Memory Agent" },
      {
        name: "description",
        content:
          "Upload an invoice PDF, review the extracted fields and run validation against purchase orders and vendor memory.",
      },
      { property: "og:title", content: "Upload invoice — AP Memory Agent" },
      {
        property: "og:description",
        content: "Extract invoice fields, validate against the PO and recall vendor history.",
      },
    ],
  }),
  component: UploadPage,
});

type Stage = "idle" | "extracting" | "extracted";

function UploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [fileName, setFileName] = useState("");
  const [extracted, setExtracted] = useState<ExtractedInvoice | null>(null);

  function runExtraction(scenario: DemoScenario, name: string) {
    setStage("extracting");
    setFileName(name);
    window.setTimeout(() => {
      setExtracted(scenario.extracted);
      setStage("extracted");
    }, 900);
  }

  const process = useMutation({
    mutationFn: async () => {
      if (!extracted) throw new Error("Nothing extracted yet");
      return processInvoice(extracted, fileName);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries();
      toast.success(
        result.exceptionCount === 0
          ? "Invoice validated — no exceptions found"
          : `${result.exceptionCount} exception(s) detected — human review required`,
      );
      navigate({ to: "/invoices/$invoiceId", params: { invoiceId: result.invoiceId } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function update<K extends keyof ExtractedInvoice>(key: K, value: ExtractedInvoice[K]) {
    setExtracted((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  return (
    <AppShell breadcrumb={["AP", "Upload invoice"]}>
      <div className="rise">
        <h1 className="font-display text-[26px] leading-none font-bold tracking-tight">
          Upload an invoice
        </h1>
        <p className="mt-2 max-w-[70ch] text-[13px] text-ink/55">
          Drop a PDF to extract its fields, or run one of the three prepared demo documents. Nothing
          is posted or paid — the agent only validates, recalls prior cases and recommends.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-12 gap-4">
        <div className="col-span-5 space-y-4">
          <Panel title="1 · Document">
            <div className="p-4">
              <button
                onClick={() => fileInput.current?.click()}
                className="flex w-full flex-col items-center justify-center rounded-md border border-dashed border-line bg-panel/50 px-4 py-8 text-center transition-colors hover:bg-panel"
              >
                <span className="font-display text-[14px] font-semibold">Choose invoice PDF</span>
                <span className="mt-1 font-mono text-[11px] text-ink/45">
                  {fileName || "No file selected"}
                </span>
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  runExtraction(scenarioForFile(f.name), f.name);
                }}
              />

              <p className="label-mono mt-5">Or run a demo document</p>
              <div className="mt-2 space-y-2">
                {DEMO_SCENARIOS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => runExtraction(s, s.fileName)}
                    className="w-full rounded-md border border-line bg-card p-3 text-left transition-colors hover:border-brand/40"
                  >
                    <p className="text-[13px] font-medium">{s.label}</p>
                    <p className="mt-0.5 text-[12px] text-ink/55">{s.blurb}</p>
                    <p className="mt-1 font-mono text-[10.5px] text-ink/40">{s.expected}</p>
                  </button>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        <div className="col-span-7 space-y-4">
          <Panel
            title="2 · Extracted fields"
            right={
              <span className="font-mono text-[11px] text-ink/40">
                {stage === "extracting" ? "reading document…" : stage === "extracted" ? "editable" : "waiting"}
              </span>
            }
          >
            {!extracted ? (
              <p className="px-4 py-10 text-center text-[12.5px] text-ink/45">
                {stage === "extracting"
                  ? "Extracting vendor, PO, amounts, tax and payment terms…"
                  : "Select a document to extract invoice fields."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-4">
                <TextField label="Vendor name" value={extracted.vendor_name} onChange={(v) => update("vendor_name", v)} />
                <TextField label="Vendor ID" value={extracted.vendor_code ?? ""} onChange={(v) => update("vendor_code", v)} />
                <TextField label="Invoice number" value={extracted.invoice_number} onChange={(v) => update("invoice_number", v)} />
                <TextField label="PO number" value={extracted.po_number ?? ""} onChange={(v) => update("po_number", v)} />
                <TextField label="Invoice date" value={extracted.invoice_date ?? ""} onChange={(v) => update("invoice_date", v)} type="date" />
                <TextField label="Due date" value={extracted.due_date ?? ""} onChange={(v) => update("due_date", v)} type="date" />
                <TextField label="Subtotal" value={String(extracted.subtotal)} onChange={(v) => update("subtotal", Number(v) || 0)} type="number" />
                <TextField label="Tax / GST" value={String(extracted.tax_amount)} onChange={(v) => update("tax_amount", Number(v) || 0)} type="number" />
                <TextField label="Total amount" value={String(extracted.total_amount)} onChange={(v) => update("total_amount", Number(v) || 0)} type="number" />
                <TextField label="Payment terms" value={extracted.payment_terms ?? ""} onChange={(v) => update("payment_terms", v)} />

                <div className="col-span-2">
                  <p className="label-mono">Line items</p>
                  <div className="mt-2 divide-y divide-line rounded-md border border-line">
                    {extracted.line_items.map((li, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 text-[12.5px]">
                        <span>{li.description}</span>
                        <span className="ml-auto font-mono text-ink/55">
                          {li.quantity} × {inr(li.unit_price, false)}
                        </span>
                        <span className="w-28 text-right font-mono">{inr(li.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="3 · Validate & analyse">
            <div className="flex items-center gap-3 p-4">
              <p className="text-[12.5px] text-ink/60">
                Runs PO matching, duplicate detection, payment-term and completeness checks, then
                recalls this vendor's history for the agent's recommendation.
              </p>
              <button
                disabled={!extracted || process.isPending}
                onClick={() => process.mutate()}
                className="ml-auto shrink-0 rounded-md bg-ink px-4 py-2 text-[12.5px] font-semibold text-paper transition-colors hover:bg-ink/90 disabled:opacity-40"
              >
                {process.isPending ? "Analysing…" : "Run validation"}
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="label-mono">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-line bg-card px-2.5 py-1.5 font-mono text-[12.5px] focus:ring-2 focus:ring-brand/30 focus:outline-none"
      />
    </label>
  );
}
