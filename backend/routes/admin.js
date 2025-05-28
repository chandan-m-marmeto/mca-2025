import express from 'express';
import upload from '../middleware/upload.js';
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

// Admin routes with file upload support - use .any() to handle dynamic field names
router.post('/questions', upload.any(), createQuestion);
router.get('/results', getResults);
router.get('/statistics', getStatistics);
router.put('/questions/:id', upload.any(), updateQuestion);
router.patch('/questions/:id/status', updateQuestionStatus);
router.delete('/questions/:id', deleteQuestion);

export default router; 