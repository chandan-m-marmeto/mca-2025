import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Create directories if they don't exist with proper error handling
const createDirectories = () => {
    const directories = [
        'uploads',
        'uploads/temp', 
        'uploads/nominees'
    ];
    
    directories.forEach(dir => {
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
                console.log(`📁 Created directory: ${dir}`);
            }
        } catch (error) {
            console.error(`❌ Error creating directory ${dir}:`, error);
            // Try alternative approach
            try {
                const { execSync } = require('child_process');
                execSync(`mkdir -p ${dir} && chmod 755 ${dir}`);
                console.log(`📁 Created directory with fallback: ${dir}`);
            } catch (fallbackError) {
                console.error(`❌ Fallback directory creation failed for ${dir}:`, fallbackError);
            }
        }
    });
};

// Initialize directories
createDirectories();

// Configure multer for temporary file storage
const tempStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = 'uploads/temp';
        // Ensure temp directory exists for this request
        if (!fs.existsSync(tempDir)) {
            try {
                fs.mkdirSync(tempDir, { recursive: true, mode: 0o755 });
            } catch (error) {
                console.error('Error creating temp directory:', error);
                return cb(error);
            }
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename for temporary storage
        const uniqueId = uuidv4();
        const fileExtension = path.extname(file.originalname);
        cb(null, `temp-${uniqueId}${fileExtension}`);
    }
});

// File filter for images only
const imageFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
    }
};

// Create temp upload middleware with file size limit
const tempUpload = multer({
    storage: tempStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 20 // Maximum 20 files per request
    }
});

// Cleanup function for temporary files
export const cleanupTempFiles = (files) => {
    if (!files) return;
    
    const filesToCleanup = Array.isArray(files) ? files : [files];
    
    filesToCleanup.forEach(file => {
        if (file && file.path && fs.existsSync(file.path)) {
            try {
                fs.unlinkSync(file.path);
                console.log(`🧹 Cleaned up temp file: ${file.path}`);
            } catch (error) {
                console.error(`❌ Error cleaning up temp file ${file.path}:`, error);
            }
        }
    });
};

// Middleware to automatically cleanup temp files on response
export const autoCleanupTempFiles = (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    const cleanup = () => {
        if (req.files) {
            cleanupTempFiles(req.files);
        }
    };
    
    res.send = function(data) {
        cleanup();
        return originalSend.call(this, data);
    };
    
    res.json = function(data) {
        cleanup();
        return originalJson.call(this, data);
    };
    
    next();
};

export default tempUpload; 