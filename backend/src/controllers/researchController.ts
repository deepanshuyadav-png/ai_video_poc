import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ResearchRequestModel from '../models/researchRequest';
import ResearchPaperModel from '../models/researchPaper';
import ResearchSettingsModel from '../models/researchSettings';
import DiseaseModel from '../models/disease';
import StrainModel from '../models/strain';
import ResearchFilterOptionModel from '../models/researchFilterOption';
import { buildPubMedQuery, synthesizeSafetyProtocol } from '../services/researchSynthesizer';
import { searchPubmed } from '../services/pubmedService';
import { buildSafetyProtocolPpt } from '../services/pptBuilder';

// Resolve the chosen filter values (e.g. {sex:'male', age:'adult'}) into
// their PubMed filter expressions from the curated catalog.
const resolveFilterExpressions = async (
  filters: Record<string, string>
): Promise<string[]> => {
  const options = await ResearchFilterOptionModel.findActive();
  const expressions: string[] = [];
  for (const [group, value] of Object.entries(filters || {})) {
    if (!value || value === 'all') continue;
    const match = options.find((o) => o.filter_group === group && o.value === value);
    if (match && match.pubmed_filter) {
      expressions.push(match.pubmed_filter);
    }
  }
  return expressions;
};

const researchController = {
  // ---- Catalog for the user-facing dropdowns ----
  async getCatalog(req: AuthRequest, res: Response): Promise<void> {
    try {
      const diseases = await DiseaseModel.findActive();
      const diseasesWithStrains = await Promise.all(
        diseases.map(async (d) => ({
          ...d,
          strains: await StrainModel.findActiveByDisease(d.id),
        }))
      );
      const filterOptions = await ResearchFilterOptionModel.findActive();

      // Group filter options by filter_group for convenient UI consumption.
      const filters: Record<string, typeof filterOptions> = {};
      for (const opt of filterOptions) {
        (filters[opt.filter_group] ||= []).push(opt);
      }

      res.json({ success: true, data: { diseases: diseasesWithStrains, filters } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch research catalog' });
    }
  },

  // ---- Create + run a research request (full pipeline, synchronous) ----
  async createRequest(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.userId!;
    const { diseaseId, strainId, filters } = req.body as {
      diseaseId?: number;
      strainId?: number;
      filters?: Record<string, string>;
    };

    if (!diseaseId) {
      res.status(400).json({ success: false, error: 'diseaseId is required' });
      return;
    }

    const disease = await DiseaseModel.findById(Number(diseaseId));
    if (!disease) {
      res.status(404).json({ success: false, error: 'Disease not found' });
      return;
    }

    let strain = null;
    if (strainId) {
      strain = await StrainModel.findById(Number(strainId));
    }

    // Create the request up-front so partial failures still leave a record.
    const request = await ResearchRequestModel.create({
      userId,
      diseaseId: Number(diseaseId),
      strainId: strainId ? Number(strainId) : undefined,
      filters: filters || {},
    });

    try {
      // 1) Build the PubMed query via the LLM.
      await ResearchRequestModel.updateStatus(request.id, 'building_query');
      const filterExpressions = await resolveFilterExpressions(filters || {});
      const queryResult = await buildPubMedQuery({
        diseaseName: disease.name,
        diseaseMeshTerm: disease.mesh_term,
        strainName: strain?.name,
        strainMeshTerm: strain?.mesh_term,
        filterExpressions,
      });
      if (!queryResult.success || !queryResult.query) {
        throw new Error(queryResult.error || 'Failed to build PubMed query');
      }
      await ResearchRequestModel.updateQuery(request.id, queryResult.query);

      // 2) Fetch top-K papers deterministically from PubMed.
      await ResearchRequestModel.updateStatus(request.id, 'fetching_papers');
      const settings = await ResearchSettingsModel.get();
      const searchResult = await searchPubmed(
        queryResult.query,
        settings.top_k,
        settings.ncbi_api_key || undefined
      );
      if (!searchResult.success) {
        throw new Error(searchResult.error || 'PubMed search failed');
      }
      const papers = searchResult.papers || [];
      if (papers.length === 0) {
        throw new Error('No PubMed papers found for this selection. Try different filters.');
      }
      await ResearchPaperModel.createMany(
        request.id,
        papers.map((p) => ({
          pmid: p.pmid,
          title: p.title,
          authors: p.authors,
          journal: p.journal,
          pubYear: p.pubYear,
          abstract: p.abstract,
          url: p.url,
          rank: p.rank,
        }))
      );

      // 3) Synthesize the cited safety protocol.
      await ResearchRequestModel.updateStatus(request.id, 'synthesizing');
      const topic = strain ? `${disease.name} (${strain.name})` : disease.name;
      const synthResult = await synthesizeSafetyProtocol(topic, papers);
      if (!synthResult.success || !synthResult.protocol) {
        throw new Error(synthResult.error || 'Failed to synthesize safety protocol');
      }
      await ResearchRequestModel.updateSummary(
        request.id,
        synthResult.raw || JSON.stringify(synthResult.protocol)
      );

      // 4) Build the PPT and store it.
      await ResearchRequestModel.updateStatus(request.id, 'building_ppt');
      const pptResult = await buildSafetyProtocolPpt(
        synthResult.protocol,
        papers,
        request.request_id
      );
      if (!pptResult.success || !pptResult.pptPath) {
        throw new Error(pptResult.error || 'Failed to build PPT');
      }
      await ResearchRequestModel.updatePptPath(request.id, pptResult.pptPath);

      // 5) Done.
      await ResearchRequestModel.updateStatus(request.id, 'completed');

      const full = await ResearchRequestModel.findByIdWithDetails(request.id);
      const savedPapers = await ResearchPaperModel.findByRequest(request.id);
      res.status(201).json({ success: true, data: { ...full, papers: savedPapers } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await ResearchRequestModel.updateStatus(request.id, 'failed', message);
      const full = await ResearchRequestModel.findByIdWithDetails(request.id);
      const savedPapers = await ResearchPaperModel.findByRequest(request.id);
      res.status(500).json({ success: false, error: message, data: { ...full, papers: savedPapers } });
    }
  },

  // ---- List the current user's research requests ----
  async getMyRequests(req: AuthRequest, res: Response): Promise<void> {
    try {
      const requests = await ResearchRequestModel.findByUserIdWithDetails(req.userId!);
      res.json({ success: true, data: requests });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch research requests' });
    }
  },

  // ---- Get a single request (ownership enforced) with its papers ----
  async getRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const request = await ResearchRequestModel.findByRequestIdWithDetails(id);
      if (!request) {
        res.status(404).json({ success: false, error: 'Request not found' });
        return;
      }
      if (request.user_id !== req.userId) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }
      const papers = await ResearchPaperModel.findByRequest(request.id);
      res.json({ success: true, data: { ...request, papers } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch research request' });
    }
  },
};

export default researchController;
