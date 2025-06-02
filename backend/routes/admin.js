import express from 'express';
import tempUpload, { autoCleanupTempFiles } from '../middleware/tempUpload.js';
import { 
    createQuestion, 
    updateQuestion, 
    updateQuestionStatus,
    getResults, 
    deleteQuestion, 
    getStatistics,
    getQueueStatus
} from '../controllers/adminController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Protect all admin routes
router.use(authenticateToken);
router.use(isAdmin);

// Admin routes with file upload support - use tempUpload for queue-based processing
router.post('/questions', tempUpload.any(), autoCleanupTempFiles, createQuestion);
router.get('/results', getResults);
router.get('/statistics', getStatistics);
router.get('/queue-status', getQueueStatus);
router.put('/questions/:id', tempUpload.any(), autoCleanupTempFiles, updateQuestion);
router.patch('/questions/:id/status', updateQuestionStatus);
router.delete('/questions/:id', deleteQuestion);

export default router; 