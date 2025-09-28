/**
 * MixRank Email Enricher
 *
 * A small, typed helper to enrich a work email address using the MixRank Person Match API.
 *
 * Usage:
 *   import { enrichEmailWithMixRank } from './mixrank-enricher';
 *   const result = await enrichEmailWithMixRank('user@company.com');
 *
 * Environment:
 *   MIXRANK_KEY=sk_...  (required if not provided via options)
 */

import 'dotenv/config';

const MIXRANK_BASE_URL = 'https://api.mixrank.com/v2/json';

export interface MixRankEnrichedFields {
  name?: string;
  title?: string;
  company?: string;
  linkedinUrl?: string;
  location?: string;
  industry?: string;
}

export interface MixRankEnrichmentResult {
  email: string;
  status: number; // HTTP status (or 0 on network error)
  data?: unknown; // Raw JSON body for successful responses
  error?: string; // Error message for non-200
  enriched?: MixRankEnrichedFields; // Extracted helpful fields
}

export interface MixRankOptions {
  apiKey?: string;
  timeoutMs?: number; // default 12000
}

/**
 * Enrich a single email address using MixRank Person Match API.
 * - Resolves with a structured result and extracted fields when available
 * - Never throws on HTTP errors; only throws on truly exceptional states
 */
export async function enrichEmailWithMixRank(
  email: string,
  options: MixRankOptions = {},
): Promise<MixRankEnrichmentResult> {
  if (!email || !email.includes('@')) {
    return { email, status: 400, error: 'Invalid email format' };
  }

  const apiKey = options.apiKey || process.env.MIXRANK_KEY || '';
  if (!apiKey) {
    return { email, status: 401, error: 'Missing MixRank API key (MIXRANK_KEY)' };
  }

  const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 12000;

  const url = new URL(`${MIXRANK_BASE_URL}/${apiKey}/person/match`);
  url.searchParams.set('email', email);
  url.searchParams.set('enable', 'linkedin');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? await res.json().catch(() => ({})) : await res.text();

    if (res.status === 200) {
      const entity = (body && typeof body === 'object' && Array.isArray((body as any).results) && (body as any).results.length > 0)
        ? (body as any).results[0]
        : (body as any);
      const enriched = extractEnrichedFields(entity);
      return { email, status: 200, data: body, enriched };
    }
    if (res.status === 202) return { email, status: 202, error: 'Queued. Try again later.' };
    if (res.status === 404) return { email, status: 404, error: 'Not found' };
    if (res.status === 401 || res.status === 403) return { email, status: res.status, error: 'Unauthorized. Check API key.' };
    if (res.status === 429) return { email, status: 429, error: 'Rate limited. Slow down or try later.' };

    const errMsg = isJson && (body as any)?.error ? String((body as any).error) : 'Unexpected error';
    return { email, status: res.status, error: errMsg };
  } catch (err) {
    return { email, status: 0, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeout);
  }
}

function extractEnrichedFields(data: any): MixRankEnrichedFields {
  const enriched: MixRankEnrichedFields = {};

  if (data && typeof data === 'object') {
    // Name
    const nameFull = data?.name?.full || data?.full_name;
    const first = data?.name?.first || data?.first_name;
    const last = data?.name?.last || data?.last_name;
    if (nameFull) enriched.name = String(nameFull);
    else if (first || last) enriched.name = [first, last].filter(Boolean).join(' ');

    // Title
    const liTitle = data?.linkedin?.title || data?.linkedin?.headline;
    const topPositionTitle = Array.isArray(data?.linkedin?.positions) && data.linkedin.positions.length > 0
      ? data.linkedin.positions.find((p: any) => p?.is_current)?.title || data.linkedin.positions[0]?.title
      : undefined;
    if (liTitle) enriched.title = String(liTitle);
    else if (data?.title) enriched.title = String(data.title);
    else if (data?.job_title) enriched.title = String(data.job_title);
    else if (topPositionTitle) enriched.title = String(topPositionTitle);

    // Company
    const companyName = data?.company?.name || data?.linkedin?.org || data?.current_company || data?.company;
    if (companyName) enriched.company = String(companyName);

    // LinkedIn URL
    const liUrl = data?.linkedin?.url || data?.linkedin_url || data?.profile_url;
    if (liUrl) enriched.linkedinUrl = String(liUrl);

    // Location
    const liLoc = data?.linkedin?.location?.text;
    const companyCity = data?.company?.address?.city;
    const companyCountry = data?.company?.address?.country;
    const personLocation = data?.location || (data?.city && data?.country ? `${data.city}, ${data.country}` : undefined);
    if (liLoc) enriched.location = String(liLoc);
    else if (companyCity && companyCountry) enriched.location = `${companyCity}, ${companyCountry}`;
    else if (personLocation) enriched.location = String(personLocation);

    // Industry
    const primaryIndustry = Array.isArray(data?.company?.industries)
      ? (data.company.industries.find((i: any) => i?.is_primary) || data.company.industries[0])?.name
      : undefined;
    const liIndustry = data?.linkedin?.industry || data?.industry;
    if (primaryIndustry) enriched.industry = String(primaryIndustry);
    else if (liIndustry) enriched.industry = String(liIndustry);
  }

  return enriched;
}

// Optional tiny CLI helper for manual testing
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const email = process.argv[2];
    if (!email) {
      console.error('Usage: tsx mixrank-enricher.ts user@company.com');
      process.exit(1);
    }
    const result = await enrichEmailWithMixRank(email);
    console.log(JSON.stringify(result, null, 2));
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}


