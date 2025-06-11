import Question from '../models/Question.js';
import Nominee from '../models/Nominee.js';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { uploadToS3, deleteFromS3 } from '../config/s3.js';
import VotingSession from '../models/VotingSession.js';
import { Parser } from 'json2csv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const ensureDirectories = () => {
    const directories = ['uploads', 'uploads/temp', 'uploads/nominees'];
    directories.forEach(dir => {
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
                console.log(`📁 Created upload directory: ${dir}`);
            }
        } catch (error) {
            console.error(`❌ Error creating directory ${dir}:`, error);
        }
    });
};

// Initialize directories
ensureDirectories();

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

// Create a new question with instant response (NO FILES)
export const createQuestion = async (req, res) => {
    try {
        console.log('📝 CREATE QUESTION REQUEST:');
        console.log('Headers:', req.headers);
        console.log('Body:', JSON.stringify(req.body, null, 2));
        console.log('Content-Type:', req.headers['content-type']);
        
        const { title, description, nominees } = req.body;

        console.log('📋 Extracted data:');
        console.log('- Title:', title);
        console.log('- Description:', description);
        console.log('- Nominees (raw):', nominees);
        console.log('- Nominees type:', typeof nominees);
        console.log('- Is Array:', Array.isArray(nominees));

        // Validate nominees
        let parsedNominees;
        if (Array.isArray(nominees)) {
            console.log('✅ Nominees is already an array');
            parsedNominees = nominees;
        } else if (typeof nominees === 'string') {
            console.log('🔄 Parsing nominees from string...');
            try {
                parsedNominees = JSON.parse(nominees);
                console.log('✅ Parsed nominees:', parsedNominees);
            } catch (error) {
                console.error('❌ JSON parse error:', error);
                return res.status(400).json({
                    success: false,
                    error: 'Invalid nominees JSON format'
                });
            }
        } else {
            console.error('❌ Invalid nominees type:', typeof nominees);
            console.error('❌ Nominees value:', nominees);
            return res.status(400).json({
                success: false,
                error: `Invalid nominees format - expected array or string, got ${typeof nominees}`
            });
        }

        // Create all nominees (single batch operation)
        const nomineeDataArray = parsedNominees.map((nominee, index) => {
            const nomineeData = {
                name: nominee.name.trim(),
                votes: 0,
                image: null,
                imageProcessed: true
            };
            console.log(`👤 Creating nominee ${index + 1}:`, nomineeData);
            return nomineeData;
        });

        console.log('💾 Inserting nominees into database...');
        const createdNominees = await Nominee.insertMany(nomineeDataArray);
        console.log('✅ Nominees created:', createdNominees.length);

        // Create question with nominee IDs (single operation)
        console.log('📄 Creating question document...');
        const question = await new Question({
            title,
            description,
            nominees: createdNominees.map(n => n._id),
            isActive: false
        }).save();

        console.log('✅ Question created with ID:', question._id);

        // RESPOND IMMEDIATELY with complete data
        const responseData = {
            _id: question._id,
            title,
            description,
            isActive: false,
            nominees: createdNominees.map(nominee => ({
                _id: nominee._id,
                name: nominee.name,
                votes: 0,
                image: null,
                imageProcessed: true
            }))
        };

        console.log('🎉 Question created instantly:', title);
        console.log('📤 Sending response...');

        res.status(201).json({
            success: true,
            data: responseData,
            message: 'Question created successfully!'
        });

    } catch (error) {
        console.error('Create question error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Something went wrong!'
        });
    }
};

// Start a new voting session
export const startVotingSession = async (req, res) => {
    try {
        // First check if there's an active session
        const existingSession = await VotingSession.findOne({ isActive: true });
        if (existingSession) {
            return res.status(400).json({
                success: false,
                error: 'Another voting session is already active'
            });
        }

        const { duration } = req.body;
        
        if (!duration || duration < 1) {
            return res.status(400).json({
                success: false,
                error: 'Valid duration in hours is required'
            });
        }

        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + (duration * 60 * 60 * 1000));

        // Create new voting session
        const session = await new VotingSession({
            isActive: true,
            startTime,
            endTime
        }).save();

        res.json({
            success: true,
            data: session,
            message: 'Voting session started successfully!'
        });
    } catch (error) {
        console.error('Start voting session error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to start voting session'
        });
    }
};

// End current voting session
export const endVotingSession = async (req, res) => {
    try {
        // Find and end active session
        const session = await VotingSession.findOneAndUpdate(
            { isActive: true },
            { isActive: false },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'No active voting session found'
            });
        }

        // Deactivate all questions
        await Question.updateMany({}, { isActive: false });

        res.json({
            success: true,
            data: session,
            message: 'Voting session ended successfully!'
        });
    } catch (error) {
        console.error('End voting session error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to end voting session'
        });
    }
};

// Get current voting session status
export const getVotingSessionStatus = async (req, res) => {
    try {
        const session = await VotingSession.findOne({ isActive: true });
        
        res.json({
            success: true,
            data: {
                isActive: !!session,
                endTime: session?.endTime || null
            }
        });
    } catch (error) {
        console.error('Get voting session status error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get voting session status'
        });
    }
};

// Renamed function for true background processing - REMOVED DELAY
const processImageInBackground = async (nomineeId, questionId, tempFilePath, originalName) => {
    // Start immediately - no delay needed since response is already sent
    try {
        console.log(`🖼️ Starting background image processing for nominee ${nomineeId}...`);
        
        // Ensure the final directory exists
        const finalDir = path.join(process.cwd(), 'uploads', 'nominees');
        if (!fs.existsSync(finalDir)) {
            fs.mkdirSync(finalDir, { recursive: true, mode: 0o755 });
            console.log(`📁 Created final directory: ${finalDir}`);
        }
        
        // Verify temp file still exists
        if (!fs.existsSync(tempFilePath)) {
            console.error(`❌ Temp file no longer exists: ${tempFilePath}`);
            return;
        }
        
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(originalName);
        const finalFilename = `nominee-${uniqueSuffix}${fileExtension}`;
        const finalPath = path.join(finalDir, finalFilename);
        
        // Process image with sharp
        await sharp(tempFilePath)
            .resize(400, 400, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 85 })
            .png({ quality: 85 })
            .webp({ quality: 85 })
            .toFile(finalPath);
        
        // Update nominee in MongoDB
        await Nominee.findByIdAndUpdate(nomineeId, {
            image: `/uploads/nominees/${finalFilename}`,
            imageProcessed: true
        });
        
        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log(`🧹 Cleaned up temp file: ${tempFilePath}`);
        }
        
        console.log(`✅ Background image processing completed for nominee ${nomineeId}`);
        
        // Emit socket event for real-time UI update
        if (global.io) {
            global.io.emit('imageProcessed', {
                nomineeId,
                questionId,
                imagePath: `/uploads/nominees/${finalFilename}`
            });
            console.log(`📡 Socket event emitted for nominee ${nomineeId}`);
        }
        
    } catch (error) {
        console.error(`❌ Background image processing failed for nominee ${nomineeId}:`, error);
        
        // Clean up temp file even on error
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log(`🧹 Cleaned up temp file after error: ${tempFilePath}`);
        }
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
            if (nominee.image && nominee.image !== null) {
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
                    image: null, // No default image - use CSS initials
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
                } else if (existingNominee && existingNominee.image && existingNominee.image !== null) {
                    // Keep existing image if no new image uploaded
                    nomineeData.image = existingNominee.image;
                    nomineeData.imageProcessed = existingNominee.imageProcessed;
                }

                const createdNominee = await new Nominee(nomineeData).save();

                // If there's an image file, add it to the processing queue
                if (imageFile) {
                    processImageInBackground(
                        createdNominee._id,
                        existingQuestion._id,
                        imageFile.path,
                        imageFile.originalname
                    );
                    console.log(`📥 Started processing image for updated nominee: ${nominee.name}`);
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
                image: nominee.image,
                imageProcessed: nominee.imageProcessed
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
        const activeQuestions = await Question.countDocuments({ isActive: true });
        const totalVotes = await Question.aggregate([
            { $lookup: { from: 'nominees', localField: 'nominees', foreignField: '_id', as: 'nomineeData' } },
            { $unwind: '$nomineeData' },
            { $group: { _id: null, totalVotes: { $sum: '$nomineeData.votes' } } }
        ]);

        res.json({
            success: true,
            data: {
                totalQuestions,
                activeQuestions,
                totalVotes: totalVotes[0]?.totalVotes || 0
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

const getQuestionStatus = (question) => {
    const now = new Date();
    const start = new Date(question.startTime);
    const end = new Date(question.endTime);

    if (!question.isActive) return 'inactive';
    if (now < start) return 'scheduled';
    if (now > end) return 'expired';
    return 'active';
};

// Upload nominee image to S3
export const uploadNomineeImage = async (req, res) => {
    try {
        const { nomineeId } = req.params;
        
        console.log('📥 Upload nominee image request:', {
            nomineeId,
            hasFile: !!req.file,
            fileDetails: req.file ? {
                fieldname: req.file.fieldname,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: req.file.path
            } : null
        });

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No image file provided' });
        }

        // Generate unique S3 key
        const timestamp = Date.now();
        const s3Key = `nominees/nominee-${nomineeId}-${timestamp}.${req.file.originalname.split('.').pop()}`;

        console.log('🔑 Generated S3 key:', s3Key);

        try {
            // Upload to S3
            const imageUrl = await uploadToS3(req.file, s3Key);
            console.log('✅ Image uploaded to S3:', imageUrl);

            // Update nominee with new image URL
            const nominee = await Nominee.findById(nomineeId);
            if (!nominee) {
                return res.status(404).json({ success: false, error: 'Nominee not found' });
            }

            // Delete old image if exists
            if (nominee.image) {
                const oldKey = nominee.image.split('/').pop();
                try {
                    await deleteFromS3(`nominees/${oldKey}`);
                    console.log('✅ Old image deleted from S3:', oldKey);
                } catch (deleteError) {
                    console.error('⚠️ Error deleting old image:', deleteError);
                    // Continue with the update even if delete fails
                }
            }

            // Update nominee with new image URL
            nominee.image = imageUrl;
            nominee.imageProcessed = true;
            await nominee.save();
            console.log('✅ Nominee updated with new image URL');

            res.json({ 
                success: true, 
                message: 'Image uploaded successfully',
                imageUrl: imageUrl
            });
        } catch (uploadError) {
            console.error('❌ Error during S3 upload or nominee update:', uploadError);
            throw uploadError; // Re-throw to be caught by outer catch
        }
    } catch (error) {
        console.error('❌ Error uploading nominee image:', error);
        // Clean up the temp file if it exists
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
                console.log('✅ Cleaned up temp file:', req.file.path);
            } catch (cleanupError) {
                console.error('⚠️ Error cleaning up temp file:', cleanupError);
            }
        }
        res.status(500).json({ 
            success: false, 
            error: 'Failed to upload image: ' + error.message 
        });
    }
};

// Activate all questions
export const activateAllQuestions = async (req, res) => {
    try {
        // Update all questions to be active
        await Question.updateMany({}, { isActive: true });

        res.json({
            success: true,
            message: 'All questions activated successfully'
        });
    } catch (error) {
        console.error('Activate all questions error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to activate questions'
        });
    }
};

export const getExportResults = async (req, res) => {
    try {
        // Get all questions with their nominees
        const questions = await Question.find()
            .populate('nominees')
            .sort('-createdAt');

        // Prepare data for CSV
        const csvData = [];
        
        questions.forEach(question => {
            // Calculate total votes for this question
            const totalVotes = question.nominees.reduce((sum, n) => sum + (n.votes || 0), 0);
            
            // Sort nominees by votes
            const sortedNominees = [...question.nominees].sort((a, b) => (b.votes || 0) - (a.votes || 0));
            const winner = sortedNominees[0];
            
            // Add question data to CSV
            csvData.push({
                'Question Title': question.title,
                'Question Description': question.description,
                'Total Votes': totalVotes,
                'Winner Name': winner?.name || 'No votes',
                'Winner Votes': winner?.votes || 0,
                'Winner Percentage': totalVotes > 0 ? ((winner.votes / totalVotes) * 100).toFixed(1) + '%' : '0%',
                'Status': question.isActive ? 'Active' : 'Inactive',
                'All Nominees Results': sortedNominees.map(n => 
                    `${n.name}: ${n.votes} votes (${
                        totalVotes > 0 ? ((n.votes / totalVotes) * 100).toFixed(1) : 0
                    }%)`
                ).join(' | ')
            });
        });

        // Convert to CSV
        const fields = [
            'Question Title',
            'Question Description',
            'Total Votes',
            'Winner Name',
            'Winner Votes',
            'Winner Percentage',
            'Status',
            'All Nominees Results'
        ];

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(csvData);

        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=mca2025-results-${new Date().toISOString().split('T')[0]}.csv`);

        // Send CSV
        res.send(csv);

    } catch (error) {
        console.error('Export results error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to export results'
        });
    }
};