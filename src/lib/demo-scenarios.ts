import type { ExtractedInvoice } from "./ap-types";

export interface DemoScenario {
  key: "normal" | "mismatch" | "duplicate";
  label: string;
  fileName: string;
  blurb: string;
  expected: string;
  extracted: ExtractedInvoice;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    key: "normal",
    label: "Clean invoice",
    fileName: "ZIM-2026-120_invoice.pdf",
    blurb: "Zimra Office Systems — matches PO-2026-055 exactly.",
    expected: "Should pass validation and be marked valid.",
    extracted: {
      vendor_name: "Zimra Office Systems Pvt. Ltd.",
      vendor_code: "V-1088",
      invoice_number: "ZIM-2026-120",
      invoice_date: "2026-03-22",
      due_date: "2026-04-21",
      po_number: "PO-2026-055",
      subtotal: 120000,
      tax_amount: 21600,
      total_amount: 141600,
      payment_terms: "Net 30",
      line_items: [
        { description: "Laptop docking stations", quantity: 20, unit_price: 4200, amount: 84000 },
        { description: "27-inch monitors", quantity: 8, unit_price: 4500, amount: 36000 },
      ],
    },
  },
  {
    key: "mismatch",
    label: "PO mismatch",
    fileName: "APS-2026-002_invoice.pdf",
    blurb: "Apex Office Solutions — bills ₹48,500 against a ₹45,000 PO.",
    expected: "Should flag a PO mismatch of ₹3,500 and recall past freight cases.",
    extracted: {
      vendor_name: "Apex Office Solutions Pvt. Ltd.",
      vendor_code: "V-1042",
      invoice_number: "APS-2026-002",
      invoice_date: "2026-03-14",
      due_date: "2026-04-03",
      po_number: "PO-2026-042",
      subtotal: 48500,
      tax_amount: 8730,
      total_amount: 57230,
      payment_terms: "Net 20",
      line_items: [
        { description: "Modular workstation units", quantity: 5, unit_price: 7000, amount: 35000 },
        { description: "Storage pedestals", quantity: 10, unit_price: 1000, amount: 10000 },
        { description: "Freight & delivery charges", quantity: 1, unit_price: 3500, amount: 3500 },
      ],
    },
  },
  {
    key: "duplicate",
    label: "Duplicate invoice",
    fileName: "APS-2026-001_invoice.pdf",
    blurb: "Apex Office Solutions — invoice number already in the ledger.",
    expected: "Should flag a possible duplicate and require human review.",
    extracted: {
      vendor_name: "Apex Office Solutions Pvt. Ltd.",
      vendor_code: "V-1042",
      invoice_number: "APS-2026-001",
      invoice_date: "2026-03-08",
      due_date: "2026-03-28",
      po_number: "PO-2026-031",
      subtotal: 30000,
      tax_amount: 5400,
      total_amount: 35400,
      payment_terms: "Net 20",
      line_items: [
        { description: "A4 copier paper (500 sheets)", quantity: 40, unit_price: 300, amount: 12000 },
        { description: "Ergonomic chair mats", quantity: 12, unit_price: 1500, amount: 18000 },
      ],
    },
  },
];

export function scenarioForFile(fileName: string): DemoScenario {
  const name = fileName.toLowerCase();
  const hit = DEMO_SCENARIOS.find((s) => name.includes(s.extracted.invoice_number.toLowerCase()));
  return (hit ?? DEMO_SCENARIOS[1]) as DemoScenario;
}
