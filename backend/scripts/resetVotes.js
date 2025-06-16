import mongoose from 'mongoose';
import User from '../models/User.js';
import Nominee from '../models/Nominee.js';

const MONGODB_URI = 'mongodb://localhost:27017/mca2025';

const resetVotes = async (userEmail) => {
    try {
        console.log('Attempting to connect to MongoDB...');
        
        // Connect to your database with direct URL
        await mongoose.connect(MONGODB_URI);
        console.log('Successfully connected to MongoDB');
        
        // Find the user and their voting history
        const user = await User.findOne({ email: userEmail })
            .populate('votingHistory.votedFor');
        
        if (!user) {
            console.log('User not found');
            return;
        }

        console.log(`Found user: ${user.email}`);
        console.log(`Number of votes to reset: ${user.votingHistory.length}`);

        // Decrement vote count for each nominee the user voted for
        for (const vote of user.votingHistory) {
            if (vote.votedFor) {
                await Nominee.findByIdAndUpdate(
                    vote.votedFor,
                    { $inc: { votes: -1 } }
                );
                console.log(`Reset vote for nominee: ${vote.votedFor}`);
            }
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
            }
        );

        console.log('Successfully reset voting data');

    } catch (error) {
        console.error('Error resetting votes:', error);
    } finally {
        // Disconnect from database
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Get email from command line argument
const userEmail = process.argv[2];
if (!userEmail) {
    console.log('Please provide your email as an argument');
    process.exit(1);
}

resetVotes(userEmail);
