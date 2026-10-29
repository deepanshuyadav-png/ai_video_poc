/**
 * Deterministic PubMed client built on NCBI E-utilities.
 *
 * Flow:
 *   esearch  — query string  -> list of PMIDs (capped at top-K)
 *   efetch   — PMIDs         -> full records (title, abstract, authors, journal, year)
 *
 * E-utilities is free. An optional NCBI API key only raises the rate limit
 * (3 -> 10 requests/second). The key, if configured by the admin, is passed
 * through on every call.
 *
 * Framed as a swappable "research provider": the rest of the system depends
 * only on the normalized PubmedPaper[] shape returned here.
 */

// Node 18+ provides a global fetch at runtime; declare it for the ES2020 lib.
declare const fetch: (url: string, init?: any) => Promise<any>;

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const TOOL = 'medical-video-poc';
const EMAIL = 'poc@example.com';

export interface PubmedPaper {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  pubYear: string;
  abstract: string;
  url: string;
  rank: number;
}

export interface PubmedSearchResult {
  success: boolean;
  papers?: PubmedPaper[];
  error?: string;
}

// Build the shared identifying params NCBI asks every caller to send.
const addCommonParams = (params: URLSearchParams, apiKey?: string): void => {
  params.set('tool', TOOL);
  params.set('email', EMAIL);
  if (apiKey) {
    params.set('api_key', apiKey);
  }
};

// Call an E-utilities endpoint. Uses GET when the resulting URL is short
// (the normal case — esearch terms and small id lists), and falls back to
// POST (parameters in the body) only when the URL would be long enough to
// risk an HTTP 414. On any non-2xx response we surface NCBI's own response
// body text so the real reason is visible instead of a bare status code.
const callEutils = async (
  endpoint: string,
  params: URLSearchParams,
  label: string
): Promise<any> => {
  const qs = params.toString();
  const getUrl = `${EUTILS_BASE}/${endpoint}?${qs}`;

  let res: any;
  if (getUrl.length < 1800) {
    res = await fetch(getUrl);
  } else {
    res = await fetch(`${EUTILS_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: qs,
    });
  }

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.text();
      detail = body ? ` — ${body.slice(0, 300).replace(/\s+/g, ' ').trim()}` : '';
    } catch {
      /* ignore body read errors */
    }
    throw new Error(`PubMed ${label} failed with status ${res.status}${detail}`);
  }
  return res;
};

// Decode the handful of XML entities that show up in PubMed text fields.
const decodeEntities = (s: string): string =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));

const stripTags = (s: string): string => s.replace(/<[^>]+>/g, '');

const textBetween = (xml: string, tag: string): string => {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? decodeEntities(stripTags(m[1])).trim() : '';
};

// Parse a single <PubmedArticle> block into a normalized paper.
const parseArticle = (block: string, rank: number): PubmedPaper => {
  const pmid = textBetween(block, 'PMID');

  const title = textBetween(block, 'ArticleTitle') || '(no title)';

  // Abstract may be split across multiple <AbstractText> nodes.
  const abstractParts = [...block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi)].map(
    (m) => decodeEntities(stripTags(m[1])).trim()
  );
  const abstract = abstractParts.join('\n\n') || '(no abstract available)';

  const journal = textBetween(block, 'Title') || textBetween(block, 'ISOAbbreviation') || '';

  const year =
    textBetween(block, 'Year') ||
    (block.match(/<PubDate>[\s\S]*?<MedlineDate>([\s\S]*?)<\/MedlineDate>/i)?.[1]?.trim().slice(0, 4) ?? '');

  // Authors: collect LastName + Initials pairs.
  const authorBlocks = [...block.matchAll(/<Author[^>]*>([\s\S]*?)<\/Author>/gi)];
  const authorNames = authorBlocks
    .map((m) => {
      const last = textBetween(m[1], 'LastName');
      const initials = textBetween(m[1], 'Initials');
      const collective = textBetween(m[1], 'CollectiveName');
      if (collective) return collective;
      return [last, initials].filter(Boolean).join(' ');
    })
    .filter(Boolean);
  const authors = authorNames.length > 0 ? authorNames.join(', ') : 'Unknown authors';

  return {
    pmid,
    title,
    authors,
    journal,
    pubYear: year,
    abstract,
    url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : '',
    rank,
  };
};

const esearch = async (query: string, topK: number, apiKey?: string): Promise<string[]> => {
  const params = new URLSearchParams();
  params.set('db', 'pubmed');
  params.set('retmode', 'json');
  params.set('sort', 'relevance');
  params.set('retmax', String(topK));
  params.set('term', query.trim());
  addCommonParams(params, apiKey);

  const res = await callEutils('esearch.fcgi', params, 'esearch');
  const data = await res.json();
  const ids: string[] = data?.esearchresult?.idlist ?? [];
  return ids;
};

const efetch = async (pmids: string[], apiKey?: string): Promise<PubmedPaper[]> => {
  const params = new URLSearchParams();
  params.set('db', 'pubmed');
  params.set('retmode', 'xml');
  params.set('id', pmids.join(','));
  addCommonParams(params, apiKey);

  const res = await callEutils('efetch.fcgi', params, 'efetch');
  const xml: string = await res.text();

  const articleBlocks = [...xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/gi)].map(
    (m) => m[1]
  );

  const papers = articleBlocks.map((block, i) => parseArticle(block, i + 1));

  // Preserve the relevance order from esearch where possible.
  const byPmid = new Map(papers.map((p) => [p.pmid, p]));
  const ordered: PubmedPaper[] = [];
  pmids.forEach((id, i) => {
    const p = byPmid.get(id);
    if (p) {
      p.rank = i + 1;
      ordered.push(p);
    }
  });
  // Include any parsed papers whose PMID didn't line up, just in case.
  papers.forEach((p) => {
    if (!pmids.includes(p.pmid)) ordered.push(p);
  });

  return ordered;
};

const isInvalidKeyError = (err: unknown): boolean =>
  err instanceof Error && /api[\s_-]*key invalid/i.test(err.message);

export const searchPubmed = async (
  query: string,
  topK: number,
  apiKey?: string
): Promise<PubmedSearchResult> => {
  if (!query || !query.trim()) {
    return { success: false, error: 'Empty PubMed query' };
  }

  // Run the two-step fetch with the given key; if the key is rejected,
  // transparently fall back to the free anonymous tier (no key).
  const run = async (key?: string): Promise<PubmedSearchResult> => {
    const pmids = await esearch(query, topK, key);
    if (pmids.length === 0) {
      return { success: true, papers: [] };
    }
    const papers = await efetch(pmids, key);
    return { success: true, papers };
  };

  try {
    return await run(apiKey);
  } catch (error) {
    if (apiKey && isInvalidKeyError(error)) {
      console.warn('NCBI API key was rejected — retrying PubMed without a key.');
      try {
        return await run(undefined);
      } catch (retryError) {
        console.error('PubMed error (after key-less retry):', retryError);
        return {
          success: false,
          error: retryError instanceof Error ? retryError.message : 'Failed to query PubMed',
        };
      }
    }
    console.error('PubMed error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to query PubMed',
    };
  }
};
