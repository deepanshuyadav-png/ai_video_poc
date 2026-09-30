import { Response } from 'express';
import path from 'path';
import AvatarModel from '../models/avatar';
import VoiceModel from '../models/voice';
import ProviderConfigModel from '../models/providerConfig';
import { AuthRequest } from '../middleware/auth';

const adminController = {
  // Avatars
  async getAvatars(req: AuthRequest, res: Response): Promise<void> {
    try {
      const avatars = await AvatarModel.findAll();
      res.json({ success: true, data: avatars });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch avatars' });
    }
  },

  async createAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, provider, providerAvatarId } = req.body;

      if (!name) {
        res.status(400).json({ success: false, error: 'Name is required' });
        return;
      }

      let thumbnailPath: string | undefined;
      if (req.file) {
        thumbnailPath = path.join('images', req.file.filename);
      }

      const avatar = await AvatarModel.create({
        name,
        thumbnailPath,
        provider,
        providerAvatarId
      });

      res.status(201).json({ success: true, data: avatar });
    } catch (error) {
      console.error('Create avatar error:', error);
      res.status(500).json({ success: false, error: 'Failed to create avatar' });
    }
  },

  async updateAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, provider, providerAvatarId, isActive } = req.body;

      const existing = await AvatarModel.findById(parseInt(id));
      if (!existing) {
        res.status(404).json({ success: false, error: 'Avatar not found' });
        return;
      }

      let thumbnailPath: string | undefined;
      if (req.file) {
        thumbnailPath = path.join('images', req.file.filename);
      }

      const avatar = await AvatarModel.update(parseInt(id), {
        name,
        thumbnailPath,
        provider,
        providerAvatarId,
        isActive: isActive === 'true' || isActive === true
      });

      res.json({ success: true, data: avatar });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update avatar' });
    }
  },

  async deleteAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await AvatarModel.delete(parseInt(id));
      res.json({ success: true, message: 'Avatar deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete avatar' });
    }
  },

  // Voices
  async getVoices(req: AuthRequest, res: Response): Promise<void> {
    try {
      const voices = await VoiceModel.findAll();
      res.json({ success: true, data: voices });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch voices' });
    }
  },

  async createVoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, provider, providerVoiceId } = req.body;

      if (!name) {
        res.status(400).json({ success: false, error: 'Name is required' });
        return;
      }

      let sampleAudioPath: string | undefined;
      if (req.file) {
        sampleAudioPath = path.join('audio', req.file.filename);
      }

      const voice = await VoiceModel.create({
        name,
        sampleAudioPath,
        provider,
        providerVoiceId
      });

      res.status(201).json({ success: true, data: voice });
    } catch (error) {
      console.error('Create voice error:', error);
      res.status(500).json({ success: false, error: 'Failed to create voice' });
    }
  },

  async updateVoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, provider, providerVoiceId, isActive } = req.body;

      const existing = await VoiceModel.findById(parseInt(id));
      if (!existing) {
        res.status(404).json({ success: false, error: 'Voice not found' });
        return;
      }

      let sampleAudioPath: string | undefined;
      if (req.file) {
        sampleAudioPath = path.join('audio', req.file.filename);
      }

      const voice = await VoiceModel.update(parseInt(id), {
        name,
        sampleAudioPath,
        provider,
        providerVoiceId,
        isActive: isActive === 'true' || isActive === true
      });

      res.json({ success: true, data: voice });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update voice' });
    }
  },

  async deleteVoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await VoiceModel.delete(parseInt(id));
      res.json({ success: true, message: 'Voice deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete voice' });
    }
  },

  // Provider Configs
  async getProviderConfigs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const configs = await ProviderConfigModel.findAll();
      // mask api_key before sending
      const masked = configs.map(c => ({ ...c, api_key: '••••••••' + c.api_key.slice(-4) }));
      res.json({ success: true, data: masked });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch provider configs' });
    }
  },

  async createProviderConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, provider, model, apiKey } = req.body;
      if (!name || !provider || !model || !apiKey) {
        res.status(400).json({ success: false, error: 'name, provider, model and apiKey are required' });
        return;
      }
      const config = await ProviderConfigModel.create({ name, provider, model, apiKey });
      res.status(201).json({ success: true, data: { ...config, api_key: '••••••••' + config.api_key.slice(-4) } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create provider config' });
    }
  },

  async updateProviderConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, provider, model, apiKey } = req.body;
      const config = await ProviderConfigModel.update(parseInt(id), { name, provider, model, apiKey });
      res.json({ success: true, data: { ...config, api_key: '••••••••' + config.api_key.slice(-4) } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update provider config' });
    }
  },

  async setActiveProviderConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const config = await ProviderConfigModel.setActive(parseInt(id));
      res.json({ success: true, data: { ...config, api_key: '••••••••' + config.api_key.slice(-4) } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to set active provider config' });
    }
  },

  async deleteProviderConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await ProviderConfigModel.delete(parseInt(id));
      res.json({ success: true, message: 'Provider config deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete provider config' });
    }
  },
};

export default adminController;
