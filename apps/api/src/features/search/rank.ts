import type { SearchType } from "@coddle/shared";
import { tokenize } from "./query.js";

/** Okapi BM25 defaults. k1 saturates term frequency; b penalizes long fields. */
const BM25_K1 = 1.2;
const BM25_B = 0.75;
/** Reciprocal Rank Fusion constant used by Elastic/OpenSearch hybrid search. */
const RRF_K = 60;

const FIELD_WEIGHTS = {
  title: 5,
  skills: 3.2,
  subtitle: 2,
  body: 1,
} as const;

export type SearchDocument = {
  id: string;
  type: SearchType;
  title: string;
  subtitle: string;
  body: string;
  href: string;
  imageUrl: string | null;
  skills: { slug: string; name: string }[];
  popularity: number;
};

export type RankedDocument = SearchDocument & {
  score: number;
  snippet: string;
};

type FieldName = keyof typeof FIELD_WEIGHTS;

function fieldText(doc: SearchDocument, field: FieldName): string {
  if (field === "skills") return doc.skills.map((skill) => `${skill.name} ${skill.slug}`).join(" ");
  return doc[field];
}

function trigrams(value: string): Set<string> {
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return new Set();
  if (normalized.length < 3) return new Set([normalized]);
  const grams = new Set<string>();
  for (let i = 0; i <= normalized.length - 3; i += 1) {
    grams.add(normalized.slice(i, i + 3));
  }
  return grams;
}

function dice(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const gram of a) {
    if (b.has(gram)) overlap += 1;
  }
  return (2 * overlap) / (a.size + b.size);
}

function idf(df: number, n: number): number {
  return Math.log(1 + (n - df + 0.5) / (df + 0.5));
}

function bm25Field(
  queryTerms: string[],
  docTokens: string[],
  avgDl: number,
  df: Map<string, number>,
  n: number,
): number {
  if (queryTerms.length === 0 || docTokens.length === 0) return 0;
  const tf = new Map<string, number>();
  for (const token of docTokens) tf.set(token, (tf.get(token) ?? 0) + 1);
  const dl = docTokens.length;
  let score = 0;
  for (const term of queryTerms) {
    const freq = tf.get(term) ?? 0;
    if (freq === 0) continue;
    const denom = freq + BM25_K1 * (1 - BM25_B + BM25_B * (dl / Math.max(avgDl, 1)));
    score += idf(df.get(term) ?? 0, n) * ((freq * (BM25_K1 + 1)) / denom);
  }
  return score;
}

function fuzzyScore(query: string, terms: string[], doc: SearchDocument): number {
  const title = doc.title.toLowerCase();
  const titleGrams = trigrams(title);
  const queryGrams = trigrams(query);
  let score = dice(queryGrams, titleGrams) * 1.4;

  for (const skill of doc.skills) {
    score = Math.max(score, dice(queryGrams, trigrams(skill.name)) * 1.1);
  }

  const titleTokens = tokenize(doc.title);
  for (const term of terms) {
    const termGrams = trigrams(term);
    let best = dice(termGrams, titleGrams);
    for (const token of titleTokens) {
      best = Math.max(best, dice(termGrams, trigrams(token)));
    }
    score += best * 0.35;
  }
  return score;
}

function exactBoost(query: string, terms: string[], doc: SearchDocument): number {
  const title = doc.title.toLowerCase();
  const q = query.toLowerCase().trim();
  let boost = 1;
  if (q && title === q) boost += 0.45;
  else if (q && title.startsWith(q)) boost += 0.22;
  else if (q && title.includes(q)) boost += 0.12;

  for (const term of terms) {
    if (doc.skills.some((skill) => skill.slug === term || skill.name.toLowerCase() === term)) {
      boost += 0.16;
      break;
    }
  }
  return boost;
}

function snippetFor(doc: SearchDocument, terms: string[]): string {
  const haystack = [doc.subtitle, doc.body].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!haystack) return "";
  const lower = haystack.toLowerCase();
  let index = 0;
  for (const term of terms) {
    const found = lower.indexOf(term);
    if (found >= 0) {
      index = Math.max(0, found - 32);
      break;
    }
  }
  const slice = haystack.slice(index, index + 180).trim();
  const prefix = index > 0 ? "…" : "";
  const suffix = index + 180 < haystack.length ? "…" : "";
  return `${prefix}${slice}${suffix}`;
}

function rrf(rank: number): number {
  return 1 / (RRF_K + rank);
}

function minMax(values: number[]): (value: number) => number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!Number.isFinite(min) || max === min) return () => 0;
  return (value: number) => (value - min) / (max - min);
}

/**
 * Hybrid ranking: BM25 (weighted fields) + character-trigram fuzzy match,
 * fused with Reciprocal Rank Fusion, then boosted for exact title/skill hits
 * and query-type intent.
 */
export function rankDocuments(
  docs: SearchDocument[],
  queryText: string,
  terms: string[],
  inferredTypes: SearchType[],
): RankedDocument[] {
  if (docs.length === 0) return [];

  const queryTerms = terms.length > 0 ? terms : tokenize(queryText);
  const fields = Object.keys(FIELD_WEIGHTS) as FieldName[];
  const tokensByField = new Map<string, Record<FieldName, string[]>>();
  const df: Record<FieldName, Map<string, number>> = {
    title: new Map(),
    skills: new Map(),
    subtitle: new Map(),
    body: new Map(),
  };
  const lengths: Record<FieldName, number[]> = {
    title: [],
    skills: [],
    subtitle: [],
    body: [],
  };

  for (const doc of docs) {
    const fieldTokens = {} as Record<FieldName, string[]>;
    for (const field of fields) {
      const tokens = tokenize(fieldText(doc, field));
      fieldTokens[field] = tokens;
      lengths[field].push(tokens.length);
      const seen = new Set<string>();
      for (const token of tokens) {
        if (seen.has(token)) continue;
        seen.add(token);
        df[field].set(token, (df[field].get(token) ?? 0) + 1);
      }
    }
    tokensByField.set(`${doc.type}:${doc.id}`, fieldTokens);
  }

  const avgDl = {} as Record<FieldName, number>;
  for (const field of fields) {
    const sum = lengths[field].reduce((acc, len) => acc + len, 0);
    avgDl[field] = sum / Math.max(lengths[field].length, 1);
  }

  const n = docs.length;
  const bm25 = docs.map((doc) => {
    const tokens = tokensByField.get(`${doc.type}:${doc.id}`);
    if (!tokens) return 0;
    let score = 0;
    for (const field of fields) {
      score +=
        FIELD_WEIGHTS[field] *
        bm25Field(queryTerms, tokens[field], avgDl[field], df[field], n);
    }
    return score;
  });

  const fuzzy = docs.map((doc) => fuzzyScore(queryText, queryTerms, doc));
  const popularity = docs.map((doc) => doc.popularity);
  const popNorm = minMax(popularity);

  const bm25Order = orderIndexes(bm25);
  const fuzzyOrder = orderIndexes(fuzzy);
  const popOrder = orderIndexes(docs.map((_, i) => popNorm(popularity[i] ?? 0)));

  const inferred = new Set(inferredTypes);
  const scored = docs.map((doc, i) => {
    const fused =
      rrf(bm25Order[i] ?? n) + rrf(fuzzyOrder[i] ?? n) + 0.4 * rrf(popOrder[i] ?? n);
    const typeBoost = inferred.size === 0 || inferred.has(doc.type) ? 1 : 0.72;
    const intentBoost = inferred.has(doc.type) ? 1.18 : 1;
    const score = fused * exactBoost(queryText, queryTerms, doc) * typeBoost * intentBoost;
    return {
      ...doc,
      score,
      snippet: snippetFor(doc, queryTerms),
    };
  });

  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return scored;
}

function orderIndexes(values: number[]): number[] {
  const ranked = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value);
  const ranks = Array.from({ length: values.length }, () => ranked.length);
  ranked.forEach((row, rank) => {
    ranks[row.index] = rank + 1;
  });
  return ranks;
}
