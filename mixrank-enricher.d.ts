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
    status: number;
    data?: unknown;
    error?: string;
    enriched?: MixRankEnrichedFields;
}
export interface MixRankOptions {
    apiKey?: string;
    timeoutMs?: number;
}
/**
 * Enrich a single email address using MixRank Person Match API.
 * - Resolves with a structured result and extracted fields when available
 * - Never throws on HTTP errors; only throws on truly exceptional states
 */
export declare function enrichEmailWithMixRank(email: string, options?: MixRankOptions): Promise<MixRankEnrichmentResult>;
//# sourceMappingURL=mixrank-enricher.d.ts.map