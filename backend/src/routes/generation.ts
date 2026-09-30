import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { FOLDERS } from '../config/storage';
import generationController from '../controllers/generationController';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, FOLDERS.documents);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post('/', upload.single('document'), generationController.createRequest);
router.get('/', generationController.getMyRequests);
router.get('/:id', generationController.getRequest);
router.patch('/:id/status', generationController.updateRequestStatus);

export default router;
