import express from 'express';
import tempUpload from '../middleware/tempUpload.js';
import { 
    createQuestion, 
    updateQuestion,
    deleteQuestion, 
    getResults,
    getStatistics,
    uploadNomineeImage,
    startVotingSession,
    endVotingSession,
    getVotingSessionStatus,
    activateAllQuestions,
    getExportResults
} from '../controllers/adminController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Protect all admin routes
router.use(authenticateToken);
router.use(isAdmin);

// Question Management
router.post('/questions', createQuestion);
router.put('/questions/:id', tempUpload.any(), updateQuestion);
router.delete('/questions/:id', deleteQuestion);

// Voting Session Management
router.post('/voting-session/start', startVotingSession);
router.post('/voting-session/end', endVotingSession);
router.get('/voting-session/status', getVotingSessionStatus);
router.post('/questions/activate-all', activateAllQuestions);

// Other Admin Routes
router.get('/results', getResults);
router.get('/statistics', getStatistics);
router.post('/nominees/:nomineeId/image', tempUpload.single('image'), uploadNomineeImage);
router.get('/export-results', getExportResults);

export default router; 