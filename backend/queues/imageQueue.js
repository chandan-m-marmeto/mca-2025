import Queue from 'bull';
import redis from '../config/redis.js';
import Nominee from '../models/Nominee.js';
import Question from '../models/Question.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create image processing queue
const imageQueue = new Queue('image processing', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
    },
    defaultJobOptions: {
        removeOnComplete: 100, // Keep 100 completed jobs
        removeOnFail: 50,      // Keep 50 failed jobs
        attempts: 3,           // Retry failed jobs 3 times
        backoff: {
            type: 'exponential',
            delay: 2000
        }
    }
});

// Process image upload jobs
imageQueue.process('processImage', 5, async (job) => {
    const { nomineeId, questionId, tempFilePath, originalName } = job.data;
    
    try {
        console.log(`Processing image for nominee ${nomineeId}...`);
        
        // Validate that the nominee and question still exist
        const [nominee, question] = await Promise.all([
            Nominee.findById(nomineeId),
            Question.findById(questionId)
        ]);
        
        if (!nominee || !question) {
            throw new Error('Nominee or question not found');
        }
        
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(originalName);
        const finalFilename = `nominee-${uniqueSuffix}${fileExtension}`;
        const finalPath = path.join(process.cwd(), 'uploads', 'nominees', finalFilename);
        
        // Process image with sharp (resize, optimize)
        await sharp(tempFilePath)
            .resize(400, 400, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 85 })
            .png({ quality: 85 })
            .webp({ quality: 85 })
            .toFile(finalPath);
        
        // Update nominee with processed image path
        await Nominee.findByIdAndUpdate(nomineeId, {
            image: `/uploads/nominees/${finalFilename}`,
            imageProcessed: true
        });
        
        // Clean up temporary file
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        
        console.log(`✅ Image processed successfully for nominee ${nomineeId}`);
        
        // Emit socket event for real-time update (if socket is available)
        if (global.io) {
            global.io.emit('imageProcessed', {
                nomineeId,
                questionId,
                imagePath: `/uploads/nominees/${finalFilename}`
            });
        }
        
        return {
            success: true,
            nomineeId,
            imagePath: `/uploads/nominees/${finalFilename}`
        };
        
    } catch (error) {
        console.error(`❌ Error processing image for nominee ${nomineeId}:`, error);
        
        // Clean up temp file on error
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        
        throw error;
    }
});

// Queue event handlers
imageQueue.on('completed', (job, result) => {
    console.log(`✅ Image processing job ${job.id} completed:`, result);
});

imageQueue.on('failed', (job, err) => {
    console.error(`❌ Image processing job ${job.id} failed:`, err.message);
});

imageQueue.on('stalled', (job) => {
    console.warn(`⚠️ Image processing job ${job.id} stalled`);
});

// Function to add image processing job to queue
export const addImageProcessingJob = async (nomineeId, questionId, tempFilePath, originalName, priority = 0) => {
    try {
        const job = await imageQueue.add('processImage', {
            nomineeId,
            questionId,
            tempFilePath,
            originalName
        }, {
            priority, // Higher priority = processed first
            delay: 0  // Process immediately
        });
        
        console.log(`📥 Added image processing job ${job.id} for nominee ${nomineeId}`);
        return job;
    } catch (error) {
        console.error('Error adding image processing job:', error);
        throw error;
    }
};

// Function to get queue stats
export const getQueueStats = async () => {
    try {
        const [waiting, active, completed, failed] = await Promise.all([
            imageQueue.getWaiting(),
            imageQueue.getActive(),
            imageQueue.getCompleted(),
            imageQueue.getFailed()
        ]);
        
        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length
        };
    } catch (error) {
        console.error('Error getting queue stats:', error);
        return { waiting: 0, active: 0, completed: 0, failed: 0 };
    }
};

// Function to clean up old jobs
export const cleanupOldJobs = async () => {
    try {
        await imageQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Clean completed jobs older than 24 hours
        await imageQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Clean failed jobs older than 7 days
        console.log('✅ Queue cleanup completed');
    } catch (error) {
        console.error('Error cleaning up queue:', error);
    }
};

export default imageQueue; 