import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { FOLDERS } from '../config/storage';
import adminController from '../controllers/adminController';
import adminResearchController from '../controllers/adminResearchController';

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

// User routes (JSON body, no multer)
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// ---- Research feature admin routes (JSON body) ----

// Research settings (top-K, optional NCBI key)
router.get('/research/settings', adminResearchController.getSettings);
router.put('/research/settings', adminResearchController.updateSettings);

// Diseases (returns nested strains)
router.get('/research/diseases', adminResearchController.getDiseases);
router.post('/research/diseases', adminResearchController.createDisease);
router.put('/research/diseases/:id', adminResearchController.updateDisease);
router.delete('/research/diseases/:id', adminResearchController.deleteDisease);

// Strains
router.post('/research/strains', adminResearchController.createStrain);
router.put('/research/strains/:id', adminResearchController.updateStrain);
router.delete('/research/strains/:id', adminResearchController.deleteStrain);

// Filter options
router.get('/research/filters', adminResearchController.getFilterOptions);
router.post('/research/filters', adminResearchController.createFilterOption);
router.put('/research/filters/:id', adminResearchController.updateFilterOption);
router.delete('/research/filters/:id', adminResearchController.deleteFilterOption);

export default router;
