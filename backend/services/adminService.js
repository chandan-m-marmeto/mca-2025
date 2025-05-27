import Question from '../models/Question.js';
import Nominee from '../models/Nominee.js';
import { validateNominees, validateDateRange } from '../utils/validators.js';

class AdminService {
    // Create a new question with nominees
    async createQuestion(questionData) {
        const { title, description, nominees, startTime, endTime } = questionData;

        // Validate nominees
        if (!validateNominees(nominees)) {
            throw new Error('Invalid nominees data');
        }

        // Validate date range
        if (!validateDateRange(startTime, endTime)) {
            throw new Error('Invalid date range');
        }

        const session = await Question.startSession();
        session.startTransaction();

        try {
            // Create nominees
            const createdNominees = await Promise.all(
                nominees.map(nominee => 
                    new Nominee({
                        ...nominee,
                        votes: 0
                    }).save({ session })
                )
            );

            // Create question
            const question = new Question({
                title,
                description,
                nominees: createdNominees.map(n => n._id),
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                isActive: true
            });

            await question.save({ session });
            await session.commitTransaction();

            // Populate nominees and return
            return await Question.findById(question._id)
                .populate('nominees');
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    // Get all questions with results
    async getAllResults() {
        const questions = await Question.find()
            .populate('nominees')
            .sort('-createdAt');

        return questions.map(question => ({
            id: question._id,
            title: question.title,
            description: question.description,
            startTime: question.startTime,
            endTime: question.endTime,
            isActive: question.isActive,
            status: this.getQuestionStatus(question),
            nominees: question.nominees.map(nominee => ({
                id: nominee._id,
                name: nominee.name,
                email: nominee.email,
                department: nominee.department,
                votes: nominee.votes
            })),
            totalVotes: question.nominees.reduce((sum, nominee) => sum + nominee.votes, 0)
        }));
    }

    // Update question
    async updateQuestion(id, updates) {
        // Prevent updating critical fields
        delete updates.nominees;
        delete updates.votes;

        if (updates.startTime && updates.endTime) {
            if (!validateDateRange(updates.startTime, updates.endTime)) {
                throw new Error('Invalid date range');
            }
        }

        const question = await Question.findByIdAndUpdate(
            id,
            updates,
            { 
                new: true,
                runValidators: true
            }
        ).populate('nominees');

        if (!question) {
            throw new Error('Question not found');
        }

        return question;
    }

    // Delete question and its nominees
    async deleteQuestion(id) {
        const session = await Question.startSession();
        session.startTransaction();

        try {
            const question = await Question.findById(id);
            if (!question) {
                throw new Error('Question not found');
            }

            // Delete nominees
            await Nominee.deleteMany(
                { _id: { $in: question.nominees } },
                { session }
            );

            // Delete question
            await Question.findByIdAndDelete(id, { session });
            await session.commitTransaction();
            
            return true;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    // Get voting statistics
    async getStatistics() {
        const [
            totalQuestions,
            activeQuestions,
            totalNominees,
            votesAggregation
        ] = await Promise.all([
            Question.countDocuments(),
            Question.countDocuments({
                isActive: true,
                startTime: { $lte: new Date() },
                endTime: { $gte: new Date() }
            }),
            Nominee.countDocuments(),
            Nominee.aggregate([
                {
                    $group: {
                        _id: null,
                        totalVotes: { $sum: '$votes' }
                    }
                }
            ])
        ]);

        return {
            totalQuestions,
            activeQuestions,
            totalNominees,
            totalVotes: votesAggregation[0]?.totalVotes || 0
        };
    }

    // Helper method to get question status
    getQuestionStatus(question) {
        const now = new Date();
        const startTime = new Date(question.startTime);
        const endTime = new Date(question.endTime);

        if (!question.isActive) return 'Inactive';
        if (now < startTime) return 'Upcoming';
        if (now > endTime) return 'Ended';
        return 'Active';
    }
}

export default new AdminService(); 