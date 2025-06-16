import mongoose from 'mongoose';
import User from '../models/User.js';
import Nominee from '../models/Nominee.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file (2 levels up from scripts folder)
dotenv.config({ path: path.join(__dirname, '../../.env') });

const resetVotes = async (userEmail) => {
    try {
        // Log the MongoDB URI (without sensitive info)
        console.log('Attempting to connect to MongoDB...');
        
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        // Connect to your database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Successfully connected to MongoDB');
        
        // Find the user and their voting history
        const user = await User.findOne({ email: userEmail })
            .populate('votingHistory.votedFor');
        
        if (!user) {
            console.log('User not found');
            return;
        }

        // Start a session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            console.log(`Found user: ${user.email}`);
            console.log(`Number of votes to reset: ${user.votingHistory.length}`);

            // Decrement vote count for each nominee the user voted for
            for (const vote of user.votingHistory) {
                await Nominee.findByIdAndUpdate(
                    vote.votedFor,
                    { $inc: { votes: -1 } }, // Decrease vote count by 1
                    { session }
                );
                console.log(`Reset vote for nominee: ${vote.votedFor}`);
            }

            // Clear user's voting history and reset voting status
            await User.findByIdAndUpdate(
                user._id,
                {
                    $set: {
                        votingHistory: [],
                        votingFinalized: false,
                        finalizedAt: null
                    }
                },
                { session }
            );

            // Commit the transaction
            await session.commitTransaction();
            console.log('Successfully reset voting data');
        } catch (error) {
            // If there's an error, abort the transaction
            await session.abortTransaction();
            throw error;
        } finally {
            // End the session
            session.endSession();
        }

    } catch (error) {
        console.error('Error resetting votes:', error);
    } finally {
        // Disconnect from database
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Usage:
// node resetVotes.js youremail@marmeto.com
const userEmail = process.argv[2];
if (!userEmail) {
    console.log('Please provide your email as an argument');
    process.exit(1);
}

resetVotes(userEmail);
