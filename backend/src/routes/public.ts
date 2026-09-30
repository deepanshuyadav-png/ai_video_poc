import { Router, Response } from 'express';
import AvatarModel from '../models/avatar';
import VoiceModel from '../models/voice';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/avatars', async (req: AuthRequest, res: Response) => {
  try {
    const avatars = await AvatarModel.findActive();
    res.json({ success: true, data: avatars });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch avatars' });
  }
});

router.get('/voices', async (req: AuthRequest, res: Response) => {
  try {
    const voices = await VoiceModel.findActive();
    res.json({ success: true, data: voices });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch voices' });
  }
});

export default router;
