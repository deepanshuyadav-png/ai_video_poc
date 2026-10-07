import { Response } from 'express';
import path from 'path';
import AvatarModel from '../models/avatar';
import VoiceModel from '../models/voice';
import ProviderConfigModel from '../models/providerConfig';
import UserModel from '../models/user';
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

  // Users
  async getUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const users = await UserModel.findAll();
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
  },

  async createUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email, password, role } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, error: 'Email and password are required' });
        return;
      }

      const normalizedRole = role === 'admin' ? 'admin' : 'user';

      const existing = await UserModel.findByEmail(email);
      if (existing) {
        res.status(400).json({ success: false, error: 'Email already registered' });
        return;
      }

      const user = await UserModel.create(email, password, normalizedRole);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ success: false, error: 'Failed to create user' });
    }
  },

  async updateUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const targetId = parseInt(req.params.id);
      const actingAdminId = req.userId;
      const { role, isActive } = req.body;

      const hasRole = role !== undefined;
      const hasIsActive = isActive !== undefined;
      const normalizedIsActive = isActive === 'true' || isActive === true;

      const target = await UserModel.findById(targetId);
      if (!target) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      // Guardrail 1: self-protection
      if (targetId === actingAdminId && ((hasRole && role !== 'admin') || (hasIsActive && !normalizedIsActive))) {
        res.status(400).json({ success: false, error: 'You cannot deactivate or demote your own account' });
        return;
      }

      // Guardrail 2: last active admin
      const isDemotion = hasRole && role !== 'admin';
      const isDeactivation = hasIsActive && !normalizedIsActive;
      if ((isDemotion || isDeactivation) && target.role === 'admin' && target.is_active === true) {
        const activeAdmins = await UserModel.countActiveAdmins();
        if (activeAdmins <= 1) {
          res.status(400).json({ success: false, error: 'Cannot remove the last active admin' });
          return;
        }
      }

      if (hasRole) {
        await UserModel.updateRole(targetId, role === 'admin' ? 'admin' : 'user');
      }
      if (hasIsActive) {
        await UserModel.setActive(targetId, normalizedIsActive);
      }

      const updated = await UserModel.findById(targetId);
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ success: false, error: 'Failed to update user' });
    }
  },

  async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const targetId = parseInt(req.params.id);
      const actingAdminId = req.userId;

      if (targetId === actingAdminId) {
        res.status(400).json({ success: false, error: 'You cannot delete your own account' });
        return;
      }

      const target = await UserModel.findById(targetId);
      if (!target) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      if (target.role === 'admin' && target.is_active === true) {
        const activeAdmins = await UserModel.countActiveAdmins();
        if (activeAdmins <= 1) {
          res.status(400).json({ success: false, error: 'Cannot remove the last active admin' });
          return;
        }
      }

      await UserModel.delete(targetId);
      res.json({ success: true, message: 'User deleted' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
  },
};

export default adminController;
