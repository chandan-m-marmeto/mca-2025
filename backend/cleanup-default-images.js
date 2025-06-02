#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Nominee from './models/Nominee.js';

// Load environment variables
dotenv.config();

async function cleanupDefaultImages() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mca2025');
        console.log('🔌 Connected to MongoDB');

        // Find and update nominees with old default image path
        const result = await Nominee.updateMany(
            { 
                $or: [
                    { image: '/uploads/nominees/default-avatar.png' },
                    { image: 'default-avatar.png' },
                    { image: { $regex: /default-avatar\.png/ } }
                ]
            },
            { 
                $set: { 
                    image: null,
                    imageProcessed: true 
                } 
            }
        );

        console.log(`✅ Updated ${result.modifiedCount} nominee records`);

        // Close database connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error cleaning up default images:', error);
        process.exit(1);
    }
}

cleanupDefaultImages(); 