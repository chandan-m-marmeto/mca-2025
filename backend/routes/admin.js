import express from 'express';
import tempUpload from '../middleware/tempUpload.js';
import { 
    createQuestion, 
    updateQuestion, 
    updateQuestionStatus,
    getResults, 
    deleteQuestion, 
    getStatistics,
    uploadNomineeImage
} from '../controllers/adminController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Protect all admin routes
router.use(authenticateToken);
router.use(isAdmin);

// Admin routes - separated question creation from image uploads
router.post('/questions', createQuestion); // JSON only, no files
router.post('/nominees/:nomineeId/image', tempUpload.single('image'), uploadNomineeImage); // Image upload
router.get('/results', getResults);
router.get('/statistics', getStatistics);
router.put('/questions/:id', tempUpload.any(), updateQuestion); // Keep multipart for edit
router.patch('/questions/:id/status', updateQuestionStatus);
router.delete('/questions/:id', deleteQuestion);

export default router; 