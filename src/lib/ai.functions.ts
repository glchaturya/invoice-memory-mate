import { createServerFn } from "@tanstack/react-start";

/**
 * Reasoning layer. The agent only ANALYSES and RECOMMENDS — it never approves,
 * rejects or pays. All state changes stay with the human reviewer.
 */
export interface AnalyseInput {
  vendor: { name: string; code: string; standard_payment_terms: string; common_patterns: string[] };
  invoice: {
    invoice_number: string;
    invoice_date: string | null;
    due_date: string | null;
    po_number: string | null;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    payment_terms: string | null;
    line_items: { description: string; amount: number }[];
  };
  po: { po_number: string; po_amount: number } | null;
  exception: { exception_type: string; severity: string; title: string; detail: string };
  similar_cases: {
    invoice_number: string | null;
    title: string;
    summary: string | null;
    amount_delta: number | null;
    resolution: string | null;
    outcome: string;
    occurred_on: string | null;
  }[];
}

export interface AnalyseOutput {
  headline: string;
  action: string;
  what_is_wrong: string;
  historical_pattern: string;
  recommended_next_step: string;
  confidence: "low" | "medium" | "high";
  memory_used: string[];
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "headline",
    "action",
    "what_is_wrong",
    "historical_pattern",
    "recommended_next_step",
    "confidence",
    "memory_used",
  ],
  properties: {
    headline: { type: "string" },
    action: {
      type: "string",
      enum: ["approve_after_verification", "investigate", "reject", "request_information"],
    },
    what_is_wrong: { type: "string" },
    historical_pattern: { type: "string" },
    recommended_next_step: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    memory_used: { type: "array", items: { type: "string" } },
  },
} as const;

const SYSTEM = `You are the reasoning layer of an Accounts Payable exception agent for an Indian enterprise (amounts in INR).
You analyse one detected invoice exception together with that vendor's historical cases retrieved from memory.
Rules:
- You RECOMMEND only. Never state that an invoice has been approved, rejected or paid. A human AP reviewer decides.
- Ground the historical_pattern strictly in the supplied similar cases; cite their invoice numbers. If none are supplied, say so plainly.
- Keep every field under 60 words, factual and auditable. No greetings, no markdown.
- memory_used must list only invoice numbers or titles taken from the supplied similar cases.`;

export const analyseException = createServerFn({ method: "POST" })
  .inputValidator((data: AnalyseInput) => data)
  .handler(async ({ data }): Promise<AnalyseOutput | null> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return null;

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          stream: true,
          store: false,
          reasoning: { effort: "low" },
          input: [
            { role: "system", content: SYSTEM },
            { role: "user", content: JSON.stringify(data) },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "ap_recommendation",
              strict: true,
              schema: SCHEMA,
            },
          },
        }),
      });

      if (!response.ok || !response.body) {
        console.error("AI gateway error", response.status, await safeText(response));
        return null;
      }

      const text = await readTextStream(response.body);
      if (!text) return null;
      return JSON.parse(text) as AnalyseOutput;
    } catch (error) {
      console.error("AI analysis failed", error);
      return null;
    }
  });

async function safeText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function readTextStream(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          text?: string;
        };
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          out += evt.delta;
        } else if (evt.type === "response.output_text.done" && typeof evt.text === "string" && !out) {
          out = evt.text;
        }
      } catch {
        /* ignore keep-alive frames */
      }
    }
  }
  return out.trim();
}
