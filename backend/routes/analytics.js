import express from 'express';
import { 
    getDashboardAnalytics, 
    getQuestionAnalytics, 
    getRealTimeAnalytics 
} from '../controllers/analyticsController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { trackAction } from '../middleware/analytics.js';

const router = express.Router();

// Protect all analytics routes - admin only
router.use(authenticateToken);
router.use(isAdmin);

// Dashboard analytics
router.get('/dashboard', trackAction('analytics_view'), getDashboardAnalytics);

// Question-specific analytics
router.get('/questions/:questionId', trackAction('question_analytics_view'), getQuestionAnalytics);

// Real-time analytics
router.get('/realtime', getRealTimeAnalytics);

export default router; 