import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import DiseaseModel from '../models/disease';
import StrainModel from '../models/strain';
import ResearchFilterOptionModel from '../models/researchFilterOption';
import ResearchSettingsModel from '../models/researchSettings';

// Mask the NCBI key before returning settings to the admin UI.
const maskSettings = (s: { ncbi_api_key?: string | null } & Record<string, any>) => ({
  ...s,
  ncbi_api_key: s.ncbi_api_key ? '••••••••' + String(s.ncbi_api_key).slice(-4) : null,
});

const adminResearchController = {
  // ---------------- Settings ----------------
  async getSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const settings = await ResearchSettingsModel.get();
      res.json({ success: true, data: maskSettings(settings) });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch research settings' });
    }
  },

  async updateSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { topK, ncbiApiKey } = req.body;
      const parsedTopK = topK !== undefined ? parseInt(topK, 10) : undefined;
      if (parsedTopK !== undefined && (Number.isNaN(parsedTopK) || parsedTopK < 1 || parsedTopK > 100)) {
        res.status(400).json({ success: false, error: 'topK must be between 1 and 100' });
        return;
      }

      // Validate the NCBI key when one is provided. Empty string = clear;
      // undefined = leave unchanged. A real key is a compact token with no
      // spaces, so reject anything that looks like pasted junk.
      let cleanedKey = ncbiApiKey;
      if (typeof ncbiApiKey === 'string' && ncbiApiKey.trim() !== '') {
        const trimmed = ncbiApiKey.trim();
        if (/\s/.test(trimmed) || trimmed.length < 10 || trimmed.length > 80) {
          res.status(400).json({
            success: false,
            error:
              'That does not look like a valid NCBI API key. It should be a single token with no spaces. Leave the field blank to run without a key.',
          });
          return;
        }
        cleanedKey = trimmed;
      }

      const settings = await ResearchSettingsModel.update({
        topK: parsedTopK,
        // Blank string clears the key; undefined leaves it unchanged.
        ncbiApiKey: cleanedKey,
      });
      res.json({ success: true, data: maskSettings(settings) });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update research settings' });
    }
  },

  // ---------------- Diseases ----------------
  async getDiseases(req: AuthRequest, res: Response): Promise<void> {
    try {
      const diseases = await DiseaseModel.findAll();
      const withStrains = await Promise.all(
        diseases.map(async (d) => ({ ...d, strains: await StrainModel.findByDisease(d.id) }))
      );
      res.json({ success: true, data: withStrains });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch diseases' });
    }
  },

  async createDisease(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, meshTerm } = req.body;
      if (!name) {
        res.status(400).json({ success: false, error: 'Name is required' });
        return;
      }
      const disease = await DiseaseModel.create({ name, meshTerm });
      res.status(201).json({ success: true, data: disease });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create disease' });
    }
  },

  async updateDisease(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, meshTerm, isActive } = req.body;
      const existing = await DiseaseModel.findById(parseInt(id));
      if (!existing) {
        res.status(404).json({ success: false, error: 'Disease not found' });
        return;
      }
      const disease = await DiseaseModel.update(parseInt(id), {
        name,
        meshTerm,
        isActive: isActive === undefined ? undefined : isActive === 'true' || isActive === true,
      });
      res.json({ success: true, data: disease });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update disease' });
    }
  },

  async deleteDisease(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await DiseaseModel.delete(parseInt(id));
      res.json({ success: true, message: 'Disease deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete disease' });
    }
  },

  // ---------------- Strains ----------------
  async createStrain(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { diseaseId, name, meshTerm } = req.body;
      if (!diseaseId || !name) {
        res.status(400).json({ success: false, error: 'diseaseId and name are required' });
        return;
      }
      const strain = await StrainModel.create({ diseaseId: parseInt(diseaseId), name, meshTerm });
      res.status(201).json({ success: true, data: strain });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create strain' });
    }
  },

  async updateStrain(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, meshTerm, isActive } = req.body;
      const existing = await StrainModel.findById(parseInt(id));
      if (!existing) {
        res.status(404).json({ success: false, error: 'Strain not found' });
        return;
      }
      const strain = await StrainModel.update(parseInt(id), {
        name,
        meshTerm,
        isActive: isActive === undefined ? undefined : isActive === 'true' || isActive === true,
      });
      res.json({ success: true, data: strain });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update strain' });
    }
  },

  async deleteStrain(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await StrainModel.delete(parseInt(id));
      res.json({ success: true, message: 'Strain deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete strain' });
    }
  },

  // ---------------- Filter options ----------------
  async getFilterOptions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const options = await ResearchFilterOptionModel.findAll();
      res.json({ success: true, data: options });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch filter options' });
    }
  },

  async createFilterOption(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { filterGroup, label, value, pubmedFilter } = req.body;
      if (!filterGroup || !label || !value) {
        res.status(400).json({ success: false, error: 'filterGroup, label and value are required' });
        return;
      }
      const option = await ResearchFilterOptionModel.create({ filterGroup, label, value, pubmedFilter });
      res.status(201).json({ success: true, data: option });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create filter option' });
    }
  },

  async updateFilterOption(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { filterGroup, label, value, pubmedFilter, isActive } = req.body;
      const existing = await ResearchFilterOptionModel.findById(parseInt(id));
      if (!existing) {
        res.status(404).json({ success: false, error: 'Filter option not found' });
        return;
      }
      const option = await ResearchFilterOptionModel.update(parseInt(id), {
        filterGroup,
        label,
        value,
        pubmedFilter,
        isActive: isActive === undefined ? undefined : isActive === 'true' || isActive === true,
      });
      res.json({ success: true, data: option });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update filter option' });
    }
  },

  async deleteFilterOption(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await ResearchFilterOptionModel.delete(parseInt(id));
      res.json({ success: true, message: 'Filter option deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete filter option' });
    }
  },
};

export default adminResearchController;
