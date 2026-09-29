import { HindsightClient } from "@vectorize-io/hindsight-client";

/**
 * Server-only Hindsight access. Credentials come from server environment
 * variables and never reach the browser.
 *   HINDSIGHT_API_URL  – e.g. https://api.hindsight.vectorize.io or your self-hosted URL
 *   HINDSIGHT_API_KEY  – optional for self-hosted, required for Hindsight Cloud
 *   HINDSIGHT_BANK_ID  – optional, defaults to "ap-memory-agent"
 */
export function getHindsight(): { client: HindsightClient; bankId: string } | null {
  const baseUrl = process.env["HINDSIGHT_API_URL"];
  if (!baseUrl) return null;
  const apiKey = process.env["HINDSIGHT_API_KEY"];
  return {
    client: new HindsightClient({ baseUrl, ...(apiKey ? { apiKey } : {}) }),
    bankId: process.env["HINDSIGHT_BANK_ID"] || "ap-memory-agent",
  };
}

export const vendorTag = (code: string) => `vendor:${code}`;

export function errMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
