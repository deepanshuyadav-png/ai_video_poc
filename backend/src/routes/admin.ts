import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { FOLDERS } from '../config/storage';
import adminController from '../controllers/adminController';

const router = Router();

// Avatar upload config
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, FOLDERS.images),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Voice upload config
const voiceStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, FOLDERS.audio),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'voice-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadAvatar = multer({ storage: avatarStorage });
const uploadVoice = multer({ storage: voiceStorage });

// Avatar routes
router.get('/avatars', adminController.getAvatars);
router.post('/avatars', uploadAvatar.single('thumbnail'), adminController.createAvatar);
router.put('/avatars/:id', uploadAvatar.single('thumbnail'), adminController.updateAvatar);
router.delete('/avatars/:id', adminController.deleteAvatar);

// Voice routes
router.get('/voices', adminController.getVoices);
router.post('/voices', uploadVoice.single('sample'), adminController.createVoice);
router.put('/voices/:id', uploadVoice.single('sample'), adminController.updateVoice);
router.delete('/voices/:id', adminController.deleteVoice);

// Provider config routes
router.get('/providers', adminController.getProviderConfigs);
router.post('/providers', adminController.createProviderConfig);
router.put('/providers/:id', adminController.updateProviderConfig);
router.patch('/providers/:id/activate', adminController.setActiveProviderConfig);
router.delete('/providers/:id', adminController.deleteProviderConfig);

export default router;
