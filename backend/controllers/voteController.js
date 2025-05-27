import Question from '../models/Question.js';
import Nominee from '../models/Nominee.js';
import User from '../models/User.js';
import { isVotingActive } from '../utils/validators.js';

// Get all active questions
export const getActiveQuestions = async (req, res) => {
    try {
        const now = new Date();
        const questions = await Question.find({
            isActive: true,
            startTime: { $lte: now },
            endTime: { $gte: now }
        }).populate('nominees');

        res.json({
            success: true,
            data: questions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Submit a vote
export const submitVote = async (req, res) => {
    try {
        const { questionId, nomineeId } = req.body;
        const userId = req.user._id;

        // Validate question and voting period
        const question = await Question.findById(questionId);
        if (!question || !isVotingActive(question)) {
            return res.status(400).json({
                success: false,
                error: 'Voting is not active for this question'
            });
        }

        // Check if user has already voted
        const hasVoted = await User.findOne({
            _id: userId,
            'votingHistory.questionId': questionId
        });

        if (hasVoted) {
            return res.status(400).json({
                success: false,
                error: 'You have already voted for this question'
            });
        }

        // Validate nominee
        const nominee = await Nominee.findById(nomineeId);
        if (!nominee || !question.nominees.includes(nomineeId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid nominee'
            });
        }

        // Start transaction
        const session = await Question.startSession();
        session.startTransaction();

        try {
            // Increment nominee votes
            await Nominee.findByIdAndUpdate(
                nomineeId,
                { $inc: { votes: 1 } },
                { session }
            );

            // Record user's vote
            await User.findByIdAndUpdate(
                userId,
                {
                    $push: {
                        votingHistory: {
                            questionId,
                            votedFor: nomineeId,
                            votedAt: new Date()
                        }
                    }
                },
                { session }
            );

            await session.commitTransaction();
            session.endSession();

            res.json({
                success: true,
                message: 'Vote recorded successfully'
            });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get user's voting history
export const getVotingHistory = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate({
                path: 'votingHistory.questionId',
                select: 'title description'
            })
            .populate({
                path: 'votingHistory.votedFor',
                select: 'name department'
            });

        res.json({
            success: true,
            data: user.votingHistory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}; 