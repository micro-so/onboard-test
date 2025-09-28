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
const MIXRANK_BASE_URL = 'https://api.mixrank.com/v2/json';
/**
 * Enrich a single email address using MixRank Person Match API.
 * - Resolves with a structured result and extracted fields when available
 * - Never throws on HTTP errors; only throws on truly exceptional states
 */
export async function enrichEmailWithMixRank(email, options = {}) {
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
            const enriched = extractEnrichedFields(body);
            return { email, status: 200, data: body, enriched };
        }
        if (res.status === 202)
            return { email, status: 202, error: 'Queued. Try again later.' };
        if (res.status === 404)
            return { email, status: 404, error: 'Not found' };
        if (res.status === 401 || res.status === 403)
            return { email, status: res.status, error: 'Unauthorized. Check API key.' };
        if (res.status === 429)
            return { email, status: 429, error: 'Rate limited. Slow down or try later.' };
        const errMsg = isJson && body?.error ? String(body.error) : 'Unexpected error';
        return { email, status: res.status, error: errMsg };
    }
    catch (err) {
        return { email, status: 0, error: err instanceof Error ? err.message : String(err) };
    }
    finally {
        clearTimeout(timeout);
    }
}
function extractEnrichedFields(data) {
    const enriched = {};
    if (data && typeof data === 'object') {
        // Name
        if (data.first_name && data.last_name) {
            enriched.name = `${data.first_name} ${data.last_name}`;
        }
        else if (data.full_name) {
            enriched.name = String(data.full_name);
        }
        // Title
        if (data.title)
            enriched.title = String(data.title);
        else if (data.job_title)
            enriched.title = String(data.job_title);
        // Company
        if (data.company)
            enriched.company = String(data.company);
        else if (data.current_company)
            enriched.company = String(data.current_company);
        // LinkedIn
        if (data.linkedin_url)
            enriched.linkedinUrl = String(data.linkedin_url);
        else if (data.profile_url)
            enriched.linkedinUrl = String(data.profile_url);
        // Location
        if (data.location)
            enriched.location = String(data.location);
        else if (data.city && data.country)
            enriched.location = `${data.city}, ${data.country}`;
        // Industry
        if (data.industry)
            enriched.industry = String(data.industry);
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
//# sourceMappingURL=mixrank-enricher.js.map