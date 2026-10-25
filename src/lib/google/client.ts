import "server-only";

import { createSign } from "node:crypto";

/**
 * Minimal server-side Google API client using a service account (JWT bearer
 * flow). Credentials live only in server environment variables:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 * The service account must be added as a user on the Search Console property
 * (Restricted/Full) and as a Viewer on the GA4 property.
 */
const SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
];

export function googleCredentialsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

export function buildJwtAssertion(email: string, privateKeyPem: string, now = Math.floor(Date.now() / 1000)): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: email, scope: SCOPES.join(" "), aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${b64url(signer.sign(privateKeyPem))}`;
}

let cached: { token: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: buildJwtAssertion(email, key) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Google token request failed (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function call<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${await accessToken()}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export type SearchRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

/** Top queries over the last 28 days (Search Console data lags ~2-3 days). */
export async function searchConsoleTopQueries(siteUrl: string): Promise<SearchRow[]> {
  const end = new Date(Date.now() - 3 * 86_400_000);
  const start = new Date(end.getTime() - 28 * 86_400_000);
  const data = await call<{ rows?: SearchRow[] }>(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    { startDate: ymd(start), endDate: ymd(end), dimensions: ["query"], rowLimit: 15 },
  );
  return data.rows ?? [];
}

export type Ga4Row = { event: string; count: number };

/** Event counts for the tracked conversion events over the last 28 days. */
export async function ga4EventCounts(propertyId: string): Promise<Ga4Row[]> {
  const data = await call<{ rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] }>(
    `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`,
    {
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          inListFilter: {
            values: ["project_view", "contact_form_submit", "whatsapp_click", "assistant_open", "qualified_lead_submit", "financing_submit", "page_view"],
          },
        },
      },
    },
  );
  return (data.rows ?? []).map((r) => ({ event: r.dimensionValues[0]!.value, count: Number(r.metricValues[0]!.value) }));
}
