import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getVotingSessionStatus } from '../controllers/adminController.js';
import Question from '../models/Question.js';
import Nominee from '../models/Nominee.js';
import User from '../models/User.js';
import VotingSession from '../models/VotingSession.js';

const router = express.Router();

// Protect all voting routes
router.use(authenticateToken);

// Get voting session status
router.get('/session/status', getVotingSessionStatus);

// Get questions for voting
router.get('/questions', async (req, res) => {
    try {
        console.log('GET /questions - Starting to fetch questions for user:', req.user._id);
        
        // First check if voting is active
        const activeSession = await VotingSession.findOne({ isActive: true });
        console.log('Voting session status:', activeSession ? 'ACTIVE' : 'INACTIVE');
        
        if (!activeSession) {
            console.log('No active voting session found, returning empty questions array');
            return res.json({ 
                success: true,
                questions: [] 
            });
        }
        
        // If voting is active, return all questions
        const questions = await Question.find()
            .populate({
                path: 'nominees',
                select: '_id id name department votes oldIds'
            })
            .sort({ createdAt: -1 });
        
        console.log(`Found ${questions.length} questions in database`);
        
        // Get user's voting history
        const user = await User.findById(req.user._id, 'votingHistory');
        const votingHistory = user.votingHistory || [];
        console.log('User voting history:', JSON.stringify(votingHistory, null, 2));
        
        // Add user's vote information to each question
        const questionsWithVotes = questions.map(question => {
            const vote = votingHistory.find(v => v.questionId.toString() === question._id.toString());
            const questionObj = question.toObject();
            
            // Add vote information
            questionObj.userVote = vote ? vote.votedFor : null;
            
            // Ensure nominees have oldIds array
            if (questionObj.nominees) {
                questionObj.nominees = questionObj.nominees.map(nominee => ({
                    ...nominee,
                    oldIds: nominee.oldIds || []
                }));
            }
            
            console.log(`Question ${question._id}:`, {
                title: question.title,
                hasUserVoted: !!vote,
                votedFor: vote ? vote.votedFor : 'none',
                nominees: questionObj.nominees.map(n => ({
                    id: n._id,
                    name: n.name,
                    oldIds: n.oldIds
                }))
            });
            
            return questionObj;
        });
        
        console.log('Sending response with processed questions');
        
        res.json({ 
            success: true,
            questions: questionsWithVotes 
        });
    } catch (error) {
        console.error('Error loading questions:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Submit a vote
router.post('/submit', async (req, res) => {
    try {
        const { questionId, nomineeId } = req.body;
        
        // Check if voting is active
        const activeSession = await VotingSession.findOne({ isActive: true });
        if (!activeSession) {
            return res.status(400).json({ 
                success: false,
                error: 'Voting is not currently active' 
            });
        }

        // Check if user has already voted for this question
        const hasVoted = await User.findOne({
            _id: req.user._id,
            'votingHistory.questionId': questionId
        });

        if (hasVoted) {
            return res.status(400).json({ 
                success: false,
                error: 'You have already voted for this question' 
            });
        }

        // Update nominee votes
        await Nominee.findByIdAndUpdate(nomineeId, { $inc: { votes: 1 } });

        // Record user's vote
        await User.findByIdAndUpdate(req.user._id, {
            $push: {
                votingHistory: {
                    questionId,
                    votedFor: nomineeId,
                    votedAt: new Date()
                }
            }
        });

        res.json({ 
            success: true,
            message: 'Vote recorded successfully' 
        });
    } catch (error) {
        console.error('Error submitting vote:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

export default router; 