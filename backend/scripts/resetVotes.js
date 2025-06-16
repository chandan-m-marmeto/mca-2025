import mongoose from 'mongoose';
import User from '../models/User.js';
import Nominee from '../models/Nominee.js';

const resetVotes = async (userEmail) => {
    try {
        // Connect to your database
        await mongoose.connect(process.env.MONGODB_URI);
        
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
            // Decrement vote count for each nominee the user voted for
            for (const vote of user.votingHistory) {
                await Nominee.findByIdAndUpdate(
                    vote.votedFor,
                    { $inc: { votes: -1 } }, // Decrease vote count by 1
                    { session }
                );
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
