import { initChatModel } from 'langchain/chat_models/universal';
import { HumanMessage } from '@langchain/core/messages';
import ProviderConfigModel from '../models/providerConfig';
import { PubmedPaper } from './pubmedService';

/**
 * Two LLM-backed steps, both driven by the single active provider config
 * (same pattern as medicalSimplifier.ts):
 *
 *   1. buildPubMedQuery  — translate the curated disease/strain/filter
 *      selection into a structured PubMed query string. The LLM only PLANS
 *      the query; the deterministic pubmedService executes it.
 *
 *   2. synthesizeSafetyProtocol — synthesize a cited safety-protocol deck
 *      across the fetched papers. Every claim must cite a PMID drawn ONLY
 *      from the supplied set; nothing may be invented.
 */

const apiKeyParam: Record<string, string> = {
  openai: 'openAIApiKey',
  anthropic: 'anthropicApiKey',
  'google-genai': 'googleApiKey',
};

const getModel = async () => {
  const config = await ProviderConfigModel.findActive();
  if (!config) {
    return { error: 'No active LLM provider configured. Please configure one in the admin panel.' };
  }
  const llm = await initChatModel(config.model, {
    modelProvider: config.provider,
    temperature: 0.2,
    [apiKeyParam[config.provider]]: config.api_key,
  });
  return { llm };
};

const extractText = (content: unknown): string =>
  typeof content === 'string' ? content : JSON.stringify(content);

// Strip ```json / ``` fences the model may wrap output in.
const stripCodeFence = (s: string): string =>
  s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

export interface QueryBuildInput {
  diseaseName: string;
  diseaseMeshTerm?: string | null;
  strainName?: string | null;
  strainMeshTerm?: string | null;
  // Already resolved to PubMed filter expressions (may include empty strings).
  filterExpressions: string[];
}

const QUERY_PROMPT = `You are a biomedical search expert building a PubMed query using NCBI E-utilities syntax.

Build ONE PubMed query string for the following selection. Prefer MeSH terms where provided. Combine the disease and strain with AND. Append each demographic filter expression with AND. The query must be focused on clinical safety, prevention, and management.

Rules:
- Return ONLY the raw query string. No explanation, no quotes, no code fences.
- Use valid PubMed field tags like [MeSH Terms], [Title/Abstract].
- Include a safety/management concept, e.g. ("safety"[Title/Abstract] OR "prevention"[Title/Abstract] OR "management"[Title/Abstract] OR "treatment"[Title/Abstract]).
- Do not add date restrictions.

Selection:
{selection}

PubMed query string:`;

export const buildPubMedQuery = async (
  input: QueryBuildInput
): Promise<{ success: boolean; query?: string; error?: string }> => {
  try {
    const { llm, error } = await getModel();
    if (error || !llm) return { success: false, error };

    const diseasePart = input.diseaseMeshTerm
      ? `${input.diseaseName} (MeSH: ${input.diseaseMeshTerm})`
      : input.diseaseName;
    const strainPart = input.strainName
      ? input.strainMeshTerm
        ? `${input.strainName} (MeSH: ${input.strainMeshTerm})`
        : input.strainName
      : '(none)';
    const filtersPart =
      input.filterExpressions.filter(Boolean).length > 0
        ? input.filterExpressions.filter(Boolean).join(' ; ')
        : '(none)';

    const selection = [
      `Disease: ${diseasePart}`,
      `Strain: ${strainPart}`,
      `Demographic filter expressions to AND in: ${filtersPart}`,
    ].join('\n');

    const response = await llm.invoke([
      new HumanMessage(QUERY_PROMPT.replace('{selection}', selection)),
    ]);
    // Collapse any stray newlines/whitespace the model may wrap the query in,
    // so the final term is a single clean line.
    const query = stripCodeFence(extractText(response.content))
      .replace(/\s*\n\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!query) {
      return { success: false, error: 'LLM returned an empty PubMed query' };
    }
    return { success: true, query };
  } catch (err) {
    console.error('buildPubMedQuery error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to build query' };
  }
};

export interface SafetyProtocolSection {
  heading: string;
  bullets: string[];
}

export interface SafetyProtocol {
  title: string;
  sections: SafetyProtocolSection[];
}

const SYNTH_PROMPT = `You are a clinical safety specialist writing a SAFETY PROTOCOL presentation based ONLY on the research paper abstracts provided below.

Absolute rules:
- Use ONLY information grounded in the provided abstracts. Do NOT invent facts, numbers, or recommendations.
- Every bullet must end with one or more citations of the form [PMID: <pmid>] using ONLY PMIDs from the provided list. If a point is supported by several papers, cite all of them.
- If the abstracts do not support a safety point, omit it rather than guessing.
- Keep bullets concise and action-oriented for a safety protocol.

Return STRICT JSON only (no code fences, no prose) in this exact shape:
{
  "title": "Safety Protocol: <topic>",
  "sections": [
    { "heading": "Overview", "bullets": ["point [PMID: 12345]"] },
    { "heading": "Prevention", "bullets": ["..."] },
    { "heading": "Clinical Management", "bullets": ["..."] },
    { "heading": "Risk Groups & Precautions", "bullets": ["..."] },
    { "heading": "Key Takeaways", "bullets": ["..."] }
  ]
}

Topic: {topic}

Research papers (PMID — Title — Abstract):
{papers}

STRICT JSON:`;

export const synthesizeSafetyProtocol = async (
  topic: string,
  papers: PubmedPaper[]
): Promise<{ success: boolean; protocol?: SafetyProtocol; raw?: string; error?: string }> => {
  try {
    if (papers.length === 0) {
      return { success: false, error: 'No papers available to synthesize' };
    }

    const { llm, error } = await getModel();
    if (error || !llm) return { success: false, error };

    const papersBlock = papers
      .map(
        (p) =>
          `PMID: ${p.pmid}\nTitle: ${p.title}\nAbstract: ${p.abstract}`
      )
      .join('\n\n---\n\n');

    const response = await llm.invoke([
      new HumanMessage(
        SYNTH_PROMPT.replace('{topic}', topic).replace('{papers}', papersBlock)
      ),
    ]);
    const raw = stripCodeFence(extractText(response.content));

    let protocol: SafetyProtocol;
    try {
      protocol = JSON.parse(raw);
    } catch {
      return {
        success: false,
        raw,
        error: 'LLM did not return valid JSON for the safety protocol',
      };
    }

    if (!protocol.title || !Array.isArray(protocol.sections)) {
      return { success: false, raw, error: 'Synthesized protocol is missing required fields' };
    }

    return { success: true, protocol, raw };
  } catch (err) {
    console.error('synthesizeSafetyProtocol error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to synthesize' };
  }
};
