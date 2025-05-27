import Question from '../models/Question.js';
import Nominee from '../models/Nominee.js';
import User from '../models/User.js';
import { isVotingActive } from '../utils/validators.js';

class VoteService {
    // Get active questions with nominees
    async getActiveQuestions() {
        const now = new Date();
        return await Question.find({
            isActive: true,
            startTime: { $lte: now },
            endTime: { $gte: now }
        }).populate('nominees');
    }

    // Process a vote
    async processVote(userId, questionId, nomineeId) {
        // Get question and check if voting is active
        const question = await Question.findById(questionId);
        if (!question || !isVotingActive(question)) {
            throw new Error('Voting is not active for this question');
        }

        // Check if user has already voted
        const hasVoted = await User.findOne({
            _id: userId,
            'votingHistory.questionId': questionId
        });

        if (hasVoted) {
            throw new Error('You have already voted for this question');
        }

        // Validate nominee
        const nominee = await Nominee.findById(nomineeId);
        if (!nominee || !question.nominees.includes(nomineeId)) {
            throw new Error('Invalid nominee');
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
            return true;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    // Get user's voting history
    async getUserVotingHistory(userId) {
        return await User.findById(userId)
            .populate({
                path: 'votingHistory.questionId',
                select: 'title description'
            })
            .populate({
                path: 'votingHistory.votedFor',
                select: 'name department'
            })
            .select('votingHistory');
    }

    // Get question results
    async getQuestionResults(questionId) {
        const question = await Question.findById(questionId)
            .populate('nominees');

        if (!question) {
            throw new Error('Question not found');
        }

        const results = {
            question: {
                id: question._id,
                title: question.title,
                description: question.description,
                startTime: question.startTime,
                endTime: question.endTime,
                isActive: question.isActive
            },
            nominees: question.nominees.map(nominee => ({
                id: nominee._id,
                name: nominee.name,
                department: nominee.department,
                votes: nominee.votes
            })),
            totalVotes: question.nominees.reduce((sum, nominee) => sum + nominee.votes, 0)
        };

        return results;
    }
}

export default new VoteService(); 