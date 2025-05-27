const Question = require('../models/Question');
const Nominee = require('../models/Nominee');
const { validateNominees } = require('../utils/validators');

// Create a new question
exports.createQuestion = async (req, res) => {
    try {
        const { title, description, nominees, startTime, endTime } = req.body;

        // Validate nominees
        if (!validateNominees(nominees)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid nominees data'
            });
        }

        // Start transaction
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
            session.endSession();

            // Populate nominees and return
            const populatedQuestion = await Question.findById(question._id)
                .populate('nominees');

            res.status(201).json({
                success: true,
                data: populatedQuestion
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

// Get all questions with results
exports.getResults = async (req, res) => {
    try {
        const questions = await Question.find()
            .populate('nominees')
            .sort('-createdAt');

        const results = questions.map(question => ({
            id: question._id,
            title: question.title,
            description: question.description,
            startTime: question.startTime,
            endTime: question.endTime,
            isActive: question.isActive,
            status: getQuestionStatus(question),
            nominees: question.nominees.map(nominee => ({
                id: nominee._id,
                name: nominee.name,
                email: nominee.email,
                department: nominee.department,
                votes: nominee.votes
            }))
        }));

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Update question status
exports.updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Prevent updating critical fields
        delete updates.nominees;
        delete updates.votes;

        const question = await Question.findByIdAndUpdate(
            id,
            updates,
            { 
                new: true,
                runValidators: true
            }
        ).populate('nominees');

        if (!question) {
            return res.status(404).json({
                success: false,
                error: 'Question not found'
            });
        }

        res.json({
            success: true,
            data: question
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Delete question
exports.deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        const session = await Question.startSession();
        session.startTransaction();

        try {
            // Get question with nominees
            const question = await Question.findById(id);
            if (!question) {
                return res.status(404).json({
                    success: false,
                    error: 'Question not found'
                });
            }

            // Delete nominees
            await Nominee.deleteMany(
                { _id: { $in: question.nominees } },
                { session }
            );

            // Delete question
            await Question.findByIdAndDelete(id, { session });

            await session.commitTransaction();
            session.endSession();

            res.json({
                success: true,
                message: 'Question deleted successfully'
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

// Get question statistics
exports.getStatistics = async (req, res) => {
    try {
        const totalQuestions = await Question.countDocuments();
        const activeQuestions = await Question.countDocuments({
            isActive: true,
            startTime: { $lte: new Date() },
            endTime: { $gte: new Date() }
        });
        const totalNominees = await Nominee.countDocuments();
        const totalVotes = await Nominee.aggregate([
            {
                $group: {
                    _id: null,
                    totalVotes: { $sum: '$votes' }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                totalQuestions,
                activeQuestions,
                totalNominees,
                totalVotes: totalVotes[0]?.totalVotes || 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Helper function to get question status
const getQuestionStatus = (question) => {
    const now = new Date();
    const startTime = new Date(question.startTime);
    const endTime = new Date(question.endTime);

    if (!question.isActive) return 'Inactive';
    if (now < startTime) return 'Upcoming';
    if (now > endTime) return 'Ended';
    return 'Active';
};