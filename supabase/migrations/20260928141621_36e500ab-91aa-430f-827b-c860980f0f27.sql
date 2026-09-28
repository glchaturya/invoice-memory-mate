CREATE TABLE public.vendors (
  id uuid primary key default gen_random_uuid(),
  vendor_code text not null unique,
  name text not null,
  city text,
  standard_payment_terms text not null default 'Net 30',
  credit_limit numeric(14,2),
  common_patterns text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO anon, authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open access vendors" ON public.vendors FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  po_amount numeric(14,2) not null,
  status text not null default 'Released',
  line_item_count int not null default 1,
  approved_by text,
  payment_terms text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO anon, authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open access pos" ON public.purchase_orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  po_id uuid references public.purchase_orders(id) on delete set null,
  po_number text,
  invoice_date date,
  due_date date,
  subtotal numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  payment_terms text,
  status text not null default 'pending',
  source text not null default 'demo',
  file_name text,
  created_at timestamptz not null default now()
);
CREATE INDEX invoices_vendor_idx ON public.invoices(vendor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO anon, authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open access invoices" ON public.invoices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  amount numeric(14,2) not null default 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_line_items TO anon, authenticated;
GRANT ALL ON public.invoice_line_items TO service_role;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open access line items" ON public.invoice_line_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.exceptions (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  exception_type text not null,
  severity text not null default 'medium',
  title text not null,
  detail text,
  amount_delta numeric(14,2),
  status text not null default 'open',
  ai_recommendation jsonb,
  created_at timestamptz not null default now()
);
CREATE INDEX exceptions_invoice_idx ON public.exceptions(invoice_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exceptions TO anon, authenticated;
GRANT ALL ON public.exceptions TO service_role;
ALTER TABLE public.exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open access exceptions" ON public.exceptions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.resolutions (
  id uuid primary key default gen_random_uuid(),
  exception_id uuid not null references public.exceptions(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  action text not null,
  resolved_by text not null default 'AP Reviewer',
  notes text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resolutions TO anon, authenticated;
GRANT ALL ON public.resolutions TO service_role;
ALTER TABLE public.resolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open access resolutions" ON public.resolutions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.vendor_memory_cases (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  invoice_number text,
  case_type text not null,
  title text not null,
  summary text,
  amount_delta numeric(14,2),
  resolution text,
  outcome text not null default 'resolved',
  occurred_on date,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
CREATE INDEX memory_vendor_idx ON public.vendor_memory_cases(vendor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_memory_cases TO anon, authenticated;
GRANT ALL ON public.vendor_memory_cases TO service_role;
ALTER TABLE public.vendor_memory_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open access memory" ON public.vendor_memory_cases FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- DEMO DATA ---------------------------------------------------------------
INSERT INTO public.vendors (vendor_code, name, city, standard_payment_terms, credit_limit, common_patterns, notes) VALUES
 ('V-1042','Apex Office Solutions Pvt. Ltd.','Bengaluru, KA','Net 20',200000,ARRAY['Freight/delivery charges added outside the PO','Occasional re-submission of the same invoice number'],'Office supplies and furniture. Reliable but frequently appends delivery charges.'),
 ('V-1088','Zimra Office Systems Pvt. Ltd.','Pune, MH','Net 30',500000,ARRAY['Clean PO matching','Early-payment discount claims'],'IT hardware supplier, strong compliance record.'),
 ('V-1120','Nirvaan Facilities Services','Hyderabad, TS','Net 45',300000,ARRAY['Overtime labour hours billed above PO','Missing GST breakdown'],'Housekeeping and facility management contractor.'),
 ('V-1155','Sundar Print & Packaging','Chennai, TN','Net 15',150000,ARRAY['Paper price escalation surcharge'],'Print vendor for marketing collateral.');

INSERT INTO public.purchase_orders (po_number, vendor_id, po_amount, status, line_item_count, approved_by, payment_terms)
SELECT 'PO-2026-042', id, 45000, 'Released', 3, 'M. Rao', 'Net 20' FROM public.vendors WHERE vendor_code='V-1042';
INSERT INTO public.purchase_orders (po_number, vendor_id, po_amount, status, line_item_count, approved_by, payment_terms)
SELECT 'PO-2026-031', id, 30000, 'Released', 2, 'M. Rao', 'Net 20' FROM public.vendors WHERE vendor_code='V-1042';
INSERT INTO public.purchase_orders (po_number, vendor_id, po_amount, status, line_item_count, approved_by, payment_terms)
SELECT 'PO-2026-055', id, 120000, 'Released', 4, 'S. Iyer', 'Net 30' FROM public.vendors WHERE vendor_code='V-1088';
INSERT INTO public.purchase_orders (po_number, vendor_id, po_amount, status, line_item_count, approved_by, payment_terms)
SELECT 'PO-2026-061', id, 84500, 'Released', 2, 'A. Khan', 'Net 45' FROM public.vendors WHERE vendor_code='V-1120';
INSERT INTO public.purchase_orders (po_number, vendor_id, po_amount, status, line_item_count, approved_by, payment_terms)
SELECT 'PO-2026-067', id, 41200, 'Released', 3, 'A. Khan', 'Net 15' FROM public.vendors WHERE vendor_code='V-1155';

INSERT INTO public.invoices (invoice_number, vendor_id, po_id, po_number, invoice_date, due_date, subtotal, tax_amount, total_amount, payment_terms, status, source)
SELECT 'APS-2026-001', v.id, p.id, 'PO-2026-031', '2026-03-08','2026-03-28', 30000, 5400, 35400, 'Net 20', 'valid', 'demo'
FROM public.vendors v JOIN public.purchase_orders p ON p.po_number='PO-2026-031' WHERE v.vendor_code='V-1042';

INSERT INTO public.invoices (invoice_number, vendor_id, po_id, po_number, invoice_date, due_date, subtotal, tax_amount, total_amount, payment_terms, status, source)
SELECT 'ZIM-2026-114', v.id, p.id, 'PO-2026-055', '2026-03-16','2026-04-15', 120000, 21600, 141600, 'Net 30', 'valid', 'demo'
FROM public.vendors v JOIN public.purchase_orders p ON p.po_number='PO-2026-055' WHERE v.vendor_code='V-1088';

INSERT INTO public.invoices (invoice_number, vendor_id, po_id, po_number, invoice_date, due_date, subtotal, tax_amount, total_amount, payment_terms, status, source)
SELECT 'NVD-2026-078', v.id, p.id, 'PO-2026-061', '2026-03-12','2026-04-26', 84500, 15210, 99710, 'Net 45', 'valid', 'demo'
FROM public.vendors v JOIN public.purchase_orders p ON p.po_number='PO-2026-061' WHERE v.vendor_code='V-1120';

INSERT INTO public.invoices (invoice_number, vendor_id, po_id, po_number, invoice_date, due_date, subtotal, tax_amount, total_amount, payment_terms, status, source)
SELECT 'SPP-2026-019', v.id, p.id, 'PO-2026-067', '2026-03-05','2026-03-20', 41200, 7416, 48616, 'Net 15', 'resolved', 'demo'
FROM public.vendors v JOIN public.purchase_orders p ON p.po_number='PO-2026-067' WHERE v.vendor_code='V-1155';

INSERT INTO public.invoice_line_items (invoice_id, description, quantity, unit_price, amount)
SELECT i.id, 'A4 copier paper (500 sheets)', 40, 300, 12000 FROM public.invoices i WHERE i.invoice_number='APS-2026-001';
INSERT INTO public.invoice_line_items (invoice_id, description, quantity, unit_price, amount)
SELECT i.id, 'Ergonomic chair mats', 12, 1500, 18000 FROM public.invoices i WHERE i.invoice_number='APS-2026-001';

INSERT INTO public.vendor_memory_cases (vendor_id, invoice_number, case_type, title, summary, amount_delta, resolution, outcome, occurred_on, tags)
SELECT id, 'APS-2025-088','po_mismatch','Freight charge added to office-supply PO','Invoice exceeded PO by a delivery/freight line that was not part of the approved order.',2100,'Approved after the carrier proof of delivery and rate card were verified by AP.','approved','2025-11-11',ARRAY['freight','po_mismatch'] FROM public.vendors WHERE vendor_code='V-1042';
INSERT INTO public.vendor_memory_cases (vendor_id, invoice_number, case_type, title, summary, amount_delta, resolution, outcome, occurred_on, tags)
SELECT id, 'APS-2025-051','po_mismatch','Delivery fee appended to quarterly contract','Quarterly supply invoice carried an extra delivery fee outside PO scope.',3400,'Approved after verification; payment terms standardised to Net 20.','approved','2025-07-02',ARRAY['freight','delivery','po_mismatch'] FROM public.vendors WHERE vendor_code='V-1042';
INSERT INTO public.vendor_memory_cases (vendor_id, invoice_number, case_type, title, summary, amount_delta, resolution, outcome, occurred_on, tags)
SELECT id, 'APS-2024-190','po_mismatch','Freight disputed with vendor, PO corrected','Freight line could not be evidenced, so the PO was amended and the invoice re-issued.',1800,'Disputed with vendor; PO updated and invoice re-issued at corrected value.','reviewed','2025-01-19',ARRAY['freight','dispute','po_mismatch'] FROM public.vendors WHERE vendor_code='V-1042';
INSERT INTO public.vendor_memory_cases (vendor_id, invoice_number, case_type, title, summary, amount_delta, resolution, outcome, occurred_on, tags)
SELECT id, 'APS-2025-017','duplicate','Duplicate submission of a settled invoice','Vendor accounts team re-sent an already-paid invoice number after a system migration.',0,'Rejected as duplicate; vendor confirmed the original payment had cleared.','rejected','2025-04-08',ARRAY['duplicate'] FROM public.vendors WHERE vendor_code='V-1042';
INSERT INTO public.vendor_memory_cases (vendor_id, invoice_number, case_type, title, summary, amount_delta, resolution, outcome, occurred_on, tags)
SELECT id, 'ZIM-2025-402','payment_terms','Early-payment discount claimed on Net 30','Vendor billed with Net 15 terms against a Net 30 contract.',0,'Terms corrected to Net 30 on the invoice; vendor master left unchanged.','resolved','2025-09-22',ARRAY['payment_terms'] FROM public.vendors WHERE vendor_code='V-1088';
INSERT INTO public.vendor_memory_cases (vendor_id, invoice_number, case_type, title, summary, amount_delta, resolution, outcome, occurred_on, tags)
SELECT id, 'NVD-2025-233','po_mismatch','Overtime labour hours billed above PO','Festival-period overtime hours pushed the invoice above the facilities PO.',6800,'Approved after the site manager confirmed the overtime roster.','approved','2025-10-30',ARRAY['labour','overtime','po_mismatch'] FROM public.vendors WHERE vendor_code='V-1120';
INSERT INTO public.vendor_memory_cases (vendor_id, invoice_number, case_type, title, summary, amount_delta, resolution, outcome, occurred_on, tags)
SELECT id, 'SPP-2025-104','unusual_charge','Paper price escalation surcharge','A raw-material escalation surcharge appeared without contract backing.',2500,'Rejected; vendor re-issued the invoice at contracted rates.','rejected','2025-08-14',ARRAY['surcharge','unusual_charge'] FROM public.vendors WHERE vendor_code='V-1155';
