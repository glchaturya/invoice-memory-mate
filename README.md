# Invoice Memory

Build a full-stack web application called "AP Memory Agent" for an Accounts Payable team.

PROBLEM:

AP teams process thousands of invoices and repeatedly encounter the same exceptions. The agent should remember vendor patterns, payment terms, previous discrepancies, approval workflows, and how previous exceptions were resolved.

CORE USER FLOW:

1. An AP employee uploads an invoice PDF.

2. The application extracts the important invoice fields:

   - vendor name

   - vendor ID

   - invoice number

   - invoice date

   - due date

   - PO number

   - PO amount

   - line items

   - subtotal

   - tax/GST

   - total amount

   - payment terms

3. Validate the invoice against available purchase-order and vendor information.

4. Detect exceptions such as:

   - PO amount mismatch

   - duplicate invoice

   - payment-term mismatch

   - missing information

   - unusual charges

5. Search the vendor's historical memory for similar previous cases.

6. Use an AI agent to analyze the current exception together with relevant historical cases.

7. Show a clear recommendation explaining:

   - what is wrong

   - what similar cases happened before

   - how those cases were resolved

   - what action is recommended now

8. A human AP employee can approve, reject, or resolve the exception.

9. Save the resolution to the vendor's memory so it can influence future cases.

IMPORTANT:

The AI must recommend actions, not automatically approve or pay invoices. Keep a human-in-the-loop.

DASHBOARD:

Create a professional enterprise-style dashboard showing:

- Total invoices

- Invoices processed

- Exceptions detected

- Pending human review

- Resolved exceptions

- Recent invoices

INVOICE DETAIL PAGE:

Show:

- Invoice information

- Vendor information

- PO information

- Detected exceptions

- Severity

- Relevant previous cases

- AI recommendation

- Explanation

- Approve / Reject / Resolve actions

VENDOR MEMORY PAGE:

For each vendor show:

- Normal payment terms

- Previous invoices

- Previous exceptions

- Previous resolutions

- Approval history

- Common discrepancy patterns

DEMO DATA:

Create realistic fictional demo data for several vendors.

Create three important demo scenarios:

1. NORMAL INVOICE:

Invoice matches the PO and should be marked as valid.

2. MISMATCH INVOICE:

Vendor: Apex Office Solutions Pvt. Ltd.

Invoice number: APS-2026-002

PO number: PO-2026-042

PO amount: ₹45,000

Invoice subtotal: ₹48,500

Difference: ₹3,500

Flag this as a PO mismatch.

The vendor should have previous historical cases involving freight/delivery charges that were approved after verification.

3. DUPLICATE INVOICE:

Invoice number: APS-2026-001

This invoice number already exists in the database.

Flag it as a possible duplicate and require human review.

MEMORY DEMONSTRATION:

The application must clearly demonstrate that when a new mismatch occurs for a vendor, the agent retrieves relevant previous cases and uses them in its recommendation.

DATABASE:

Use a proper persistent database for:

- vendors

- invoices

- purchase orders

- exceptions

- resolutions

- vendor memory / historical cases

DESIGN:

Make the UI polished and suitable for a college AI hackathon.

Use a clean modern finance/enterprise dashboard.

Use clear status badges such as:

- green = resolved/valid

- yellow = needs review

- red = critical/duplicate

Do not make it look like a generic chatbot.

ARCHITECTURE:

Keep the application modular so an AI/LLM API can be connected for the reasoning layer and a persistent database can be used for memory.

Start by creating the complete frontend, database structure, demo data, and core application flow. Make the app functional rather than creating only a static mockup.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://invoice-memory-mate.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/993da5e0-e91c-5348-b452-693fe5233b82).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
