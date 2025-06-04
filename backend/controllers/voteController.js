import mongoose from 'mongoose';
import Question from '../models/Question.js';
import Nominee from '../models/Nominee.js';
import User from '../models/User.js';
import { trackVote } from '../middleware/analytics.js';

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

export const castVote = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { questionId, nomineeId } = req.body;
        const userId = req.user._id;

        // Validate input
        if (!questionId || !nomineeId) {
            return res.status(400).json({
                success: false,
                error: 'Question ID and nominee ID are required'
            });
        }

        // Find question with nominees in a single query
        const question = await Question.findOne({
            _id: questionId,
            isActive: true,
            startTime: { $lte: new Date() },
            endTime: { $gte: new Date() }
        }).session(session);

        if (!question) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                error: 'Question not found or voting period has ended'
            });
        }

        // Check if user has already voted
        const user = await User.findById(userId).session(session);
        if (user.votedQuestions.includes(questionId)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                error: 'You have already voted for this question'
            });
        }

        // Update nominee votes using findOneAndUpdate with optimistic concurrency
        const nominee = await Nominee.findOneAndUpdate(
            { 
                _id: nomineeId,
                questionId: questionId
            },
            { 
                $inc: { votes: 1 },
                $push: { 
                    voteHistory: {
                        userId,
                        timestamp: new Date()
                    }
                }
            },
            { 
                new: true,
                session,
                runValidators: true
            }
        );

        if (!nominee) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                error: 'Nominee not found'
            });
        }

        // Update user's voting history
        await User.findByIdAndUpdate(
            userId,
            { 
                $push: { 
                    votedQuestions: questionId,
                    votingHistory: {
                        questionId,
                        nomineeId,
                        timestamp: new Date()
                    }
                }
            },
            { session }
        );

        // Track analytics
        await trackVote(req, res, () => {});

        // Commit transaction
        await session.commitTransaction();

        // Emit real-time update
        if (global.io) {
            global.io.emit('vote-update', {
                questionId,
                nomineeId,
                votes: nominee.votes
            });
        }

        res.json({
            success: true,
            message: 'Vote cast successfully',
            data: {
                nominee: {
                    id: nominee._id,
                    name: nominee.name,
                    votes: nominee.votes
                }
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Vote casting error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cast vote'
        });
    } finally {
        session.endSession();
    }
}; 