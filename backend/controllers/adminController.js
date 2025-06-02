import Question from '../models/Question.js';
import Nominee from '../models/Nominee.js';
import path from 'path';
import fs from 'fs';
import { addImageProcessingJob, getQueueStats } from '../queues/imageQueue.js';

// Helper function to delete file
const deleteFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error('Error deleting file:', error);
    }
};

// Create a new question with queued image processing
export const createQuestion = async (req, res) => {
    try {
        const { title, description, nominees, duration } = req.body;
        const uploadedFiles = req.files || [];

        // Parse nominees if it's a string
        let parsedNominees;
        try {
            parsedNominees = typeof nominees === 'string' ? JSON.parse(nominees) : nominees;
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid nominees format'
            });
        }

        // Validate nominees
        if (!parsedNominees || !Array.isArray(parsedNominees) || parsedNominees.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'At least 2 nominees are required'
            });
        }

        // Calculate start and end times
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + (duration * 60 * 60 * 1000));

        // Create question first
        const question = new Question({
            title,
            description,
            nominees: [], // Will be populated after nominees are created
            startTime,
            endTime,
            isActive: true
        });

        await question.save();

        // Create nominees with default images and queue image processing
        const createdNominees = await Promise.all(
            parsedNominees.map(async (nominee, index) => {
                const nomineeData = {
                    name: nominee.name.trim(),
                    votes: 0,
                    image: '/uploads/nominees/default-avatar.png', // Always start with default
                    imageProcessed: true // Default images are already "processed"
                };

                // Check if there's an uploaded file for this nominee
                const imageFile = uploadedFiles.find(file => 
                    file.fieldname === `nominee_${index}_image`
                );

                if (imageFile) {
                    // Set as not processed and store temp path
                    nomineeData.imageProcessed = false;
                    nomineeData.tempImagePath = imageFile.path;
                }

                const createdNominee = await new Nominee(nomineeData).save();

                // If there's an image file, add it to the processing queue
                if (imageFile) {
                    try {
                        const job = await addImageProcessingJob(
                            createdNominee._id,
                            question._id,
                            imageFile.path,
                            imageFile.originalname,
                            1 // High priority for new questions
                        );

                        // Update nominee with job ID for tracking
                        await Nominee.findByIdAndUpdate(createdNominee._id, {
                            imageJobId: job.id.toString()
                        });

                        console.log(`📥 Queued image processing for nominee: ${nominee.name}`);
                    } catch (queueError) {
                        console.error('Error adding image to queue:', queueError);
                        // Don't fail the entire request if queue fails
                        // The nominee will remain with default image
                    }
                }

                return createdNominee;
            })
        );

        // Update question with nominee IDs
        question.nominees = createdNominees.map(n => n._id);
        await question.save();

        // Populate nominees and return
        const populatedQuestion = await Question.findById(question._id)
            .populate('nominees');

        // Count how many images are being processed
        const processingCount = createdNominees.filter(n => !n.imageProcessed).length;

        res.status(201).json({
            success: true,
            data: populatedQuestion,
            message: processingCount > 0 
                ? `Question created! ${processingCount} image(s) are being processed in the background.`
                : 'Question created successfully!'
        });

    } catch (error) {
        console.error('Create question error:', error);
        
        // Clean up uploaded files on error (but don't cleanup queued files)
        if (req.files) {
            req.files.forEach(file => {
                deleteFile(file.path);
            });
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Update existing question with queued image processing
export const updateQuestion = async (req, res) => {
    try {
        console.log('Update question request body:', req.body);
        console.log('Uploaded files:', req.files);
        
        const { id } = req.params;
        const { title, description, nominees, duration } = req.body;
        const uploadedFiles = req.files || [];

        // Parse nominees if it's a string
        let parsedNominees;
        try {
            parsedNominees = typeof nominees === 'string' ? JSON.parse(nominees) : nominees;
        } catch (error) {
            console.error('JSON parse error:', error);
            return res.status(400).json({
                success: false,
                error: 'Invalid nominees format'
            });
        }

        console.log('Parsed nominees:', parsedNominees);

        // Validate nominees
        if (!parsedNominees || !Array.isArray(parsedNominees) || parsedNominees.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'At least 2 nominees are required'
            });
        }

        // Get existing question
        const existingQuestion = await Question.findById(id).populate('nominees');
        if (!existingQuestion) {
            return res.status(404).json({
                success: false,
                error: 'Question not found'
            });
        }

        console.log('Existing question found:', existingQuestion.title);

        // Store existing nominees for vote preservation
        const existingNominees = existingQuestion.nominees;
        
        // Delete old nominee images (but preserve vote data)
        existingNominees.forEach(nominee => {
            if (nominee.image && nominee.image !== '/uploads/nominees/default-avatar.png') {
                const fullPath = path.join(process.cwd(), nominee.image);
                deleteFile(fullPath);
            }
        });

        // Create new nominees with queue processing - preserve votes if nominee name matches
        const createdNominees = await Promise.all(
            parsedNominees.map(async (nominee, index) => {
                // Find existing nominee with same name to preserve votes
                const existingNominee = existingNominees.find(en => 
                    en.name.toLowerCase().trim() === nominee.name.toLowerCase().trim()
                );

                const nomineeData = {
                    name: nominee.name.trim(),
                    votes: existingNominee ? existingNominee.votes : 0, // Preserve votes
                    image: '/uploads/nominees/default-avatar.png', // Always start with default
                    imageProcessed: true
                };

                // Check if there's an uploaded file for this nominee
                const imageFile = uploadedFiles.find(file => 
                    file.fieldname === `nominee_${index}_image`
                );

                if (imageFile) {
                    // Set as not processed and store temp path
                    nomineeData.imageProcessed = false;
                    nomineeData.tempImagePath = imageFile.path;
                } else if (existingNominee && existingNominee.image && existingNominee.image !== '/uploads/nominees/default-avatar.png') {
                    // Keep existing image if no new image uploaded
                    nomineeData.image = existingNominee.image;
                    nomineeData.imageProcessed = existingNominee.imageProcessed;
                }

                const createdNominee = await new Nominee(nomineeData).save();

                // If there's an image file, add it to the processing queue
                if (imageFile) {
                    try {
                        const job = await addImageProcessingJob(
                            createdNominee._id,
                            existingQuestion._id,
                            imageFile.path,
                            imageFile.originalname,
                            1 // High priority for updates
                        );

                        // Update nominee with job ID for tracking
                        await Nominee.findByIdAndUpdate(createdNominee._id, {
                            imageJobId: job.id.toString()
                        });

                        console.log(`📥 Queued image processing for updated nominee: ${nominee.name}`);
                    } catch (queueError) {
                        console.error('Error adding image to queue:', queueError);
                        // Don't fail the entire request if queue fails
                    }
                }

                return createdNominee;
            })
        );

        // Delete old nominees after creating new ones
        await Nominee.deleteMany({
            _id: { $in: existingQuestion.nominees }
        });

        // Update question
        const updates = {
            title,
            description,
            nominees: createdNominees.map(n => n._id)
        };

        // Update duration if provided
        if (duration) {
            const startTime = existingQuestion.startTime || new Date();
            const endTime = new Date(startTime.getTime() + (duration * 60 * 60 * 1000));
            updates.endTime = endTime;
        }

        const updatedQuestion = await Question.findByIdAndUpdate(
            id,
            updates,
            { 
                new: true,
                runValidators: true
            }
        ).populate('nominees');

        console.log('Question updated successfully');

        // Count how many images are being processed
        const processingCount = createdNominees.filter(n => !n.imageProcessed).length;

        res.json({
            success: true,
            data: updatedQuestion,
            message: processingCount > 0 
                ? `Question updated! ${processingCount} image(s) are being processed in the background.`
                : 'Question updated successfully!'
        });

    } catch (error) {
        console.error('Update question error:', error);
        console.error('Error stack:', error.stack);
        
        // Clean up uploaded files on error
        if (req.files) {
            req.files.forEach(file => {
                deleteFile(file.path);
            });
        }

        res.status(500).json({
            success: false,
            error: error.message || 'Something went wrong!'
        });
    }
};

// Update question status only
export const updateQuestionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        const question = await Question.findByIdAndUpdate(
            id,
            { isActive },
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
        console.error('Update question status error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get all questions with results
export const getResults = async (req, res) => {
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
                votes: nominee.votes,
                image: nominee.image
            }))
        }));

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Get results error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Delete question
export const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        // Get question with nominees
        const question = await Question.findById(id);
        if (!question) {
            return res.status(404).json({
                success: false,
                error: 'Question not found'
            });
        }

        // Delete nominees first
        await Nominee.deleteMany({
            _id: { $in: question.nominees }
        });

        // Delete question
        await Question.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Question deleted successfully'
        });
    } catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get question statistics
export const getStatistics = async (req, res) => {
    try {
        const totalQuestions = await Question.countDocuments();
        const activeQuestions = await Question.countDocuments({
            isActive: true,
            startTime: { $lte: new Date() },
            endTime: { $gte: new Date() }
        });
        const totalNominees = await Nominee.countDocuments();
        const totalVotesResult = await Nominee.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: '$votes' }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                totalQuestions,
                activeQuestions,
                totalNominees,
                totalVotes: totalVotesResult[0]?.total || 0
            }
        });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get queue statistics
export const getQueueStatus = async (req, res) => {
    try {
        const stats = await getQueueStats();
        
        res.json({
            success: true,
            data: {
                queue: stats,
                message: `${stats.waiting} jobs waiting, ${stats.active} jobs processing, ${stats.completed} completed, ${stats.failed} failed`
            }
        });
    } catch (error) {
        console.error('Queue status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get queue status'
        });
    }
};

const getQuestionStatus = (question) => {
    const now = new Date();
    const start = new Date(question.startTime);
    const end = new Date(question.endTime);

    if (!question.isActive) return 'inactive';
    if (now < start) return 'scheduled';
    if (now > end) return 'expired';
    return 'active';
};