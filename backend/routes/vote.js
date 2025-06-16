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
        
        // If voting is active, return all questions with nominees
        const questions = await Question.find()
            .populate('nominees')
            .sort({ createdAt: -1 });
        
        console.log(`Found ${questions.length} questions in database`);
        
        // Get user's voting history with nominee details
        const user = await User.findById(req.user._id)
            .populate('votingHistory.votedFor')
            .populate('votingHistory.questionId');
            
        const votingHistory = user.votingHistory || [];
        console.log('User voting history:', JSON.stringify(votingHistory, null, 2));
        
        // Add user's vote information to each question
        const questionsWithVotes = await Promise.all(questions.map(async question => {
            const questionObj = question.toObject();
            
            // Find vote for this question
            const vote = votingHistory.find(v => 
                v.questionId && 
                v.questionId._id && 
                v.questionId._id.toString() === question._id.toString()
            );
            
            // If there's a vote, find the corresponding nominee in current nominees
            if (vote && vote.votedFor) {
                const votedNominee = await Nominee.findById(vote.votedFor);
                if (votedNominee) {
                    // Find matching nominee by name (since IDs may have changed)
                    const matchingNominee = question.nominees.find(n => 
                        n.name.toLowerCase().trim() === votedNominee.name.toLowerCase().trim()
                    );
                    
                    questionObj.userVote = matchingNominee ? matchingNominee._id : null;
                    
                    console.log(`Question ${question._id} vote mapping:`, {
                        questionTitle: question.title,
                        originalVoteId: vote.votedFor,
                        votedNomineeName: votedNominee.name,
                        matchingNomineeId: matchingNominee ? matchingNominee._id : null
                    });
                }
            }
            
            return questionObj;
        }));
        
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

// Add finalize endpoint
router.post('/finalize', async (req, res) => {
    try {
        // Update user's voting status
        await User.findByIdAndUpdate(req.user._id, {
            votingFinalized: true,
            finalizedAt: new Date()
        });

        res.json({
            success: true,
            message: 'Votes finalized successfully'
        });
    } catch (error) {
        console.error('Error finalizing votes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to finalize votes'
        });
    }
});

// Add endpoint to check voting status
router.get('/status', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({
            success: true,
            data: {
                votingFinalized: user.votingFinalized
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get voting status'
        });
    }
});

export default router; 