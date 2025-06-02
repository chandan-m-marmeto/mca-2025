import express from 'express';
import tempUpload from '../middleware/tempUpload.js';
import { 
    createQuestion, 
    updateQuestion, 
    updateQuestionStatus,
    getResults, 
    deleteQuestion, 
    getStatistics
} from '../controllers/adminController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Protect all admin routes
router.use(authenticateToken);
router.use(isAdmin);

// Admin routes with file upload support - removed autoCleanupTempFiles
router.post('/questions', tempUpload.any(), createQuestion);
router.get('/results', getResults);
router.get('/statistics', getStatistics);
router.put('/questions/:id', tempUpload.any(), updateQuestion);
router.patch('/questions/:id/status', updateQuestionStatus);
router.delete('/questions/:id', deleteQuestion);

export default router; 