import { Router } from 'express';
import researchController from '../controllers/researchController';

const router = Router();

// Catalog for dropdowns (diseases + strains + filter options)
router.get('/catalog', researchController.getCatalog);

// Research requests (user-scoped)
router.post('/', researchController.createRequest);
router.get('/', researchController.getMyRequests);
router.get('/:id', researchController.getRequest);

export default router;
