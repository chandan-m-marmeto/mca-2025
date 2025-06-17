import mongoose from 'mongoose';

const connectDatabase = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mca2025';
        
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 150, // Increase connection pool size
            minPoolSize: 20,  // Minimum connections to maintain
            socketTimeoutMS: 45000, // Socket timeout
            serverSelectionTimeoutMS: 5000, // Server selection timeout
            heartbeatFrequencyMS: 10000, // Heartbeat frequency
            retryWrites: true,
            w: 'majority', // Write concern for better data consistency
            wtimeout: 2500,// Write concern timeout
            waitQueueTimeoutMS: 10000,  // How long a request waits for a connection
            waitQueueSize: 1000
        });

        // Create indexes for better query performance
        await Promise.all([
            mongoose.connection.collection('users').createIndex({ email: 1 }, { unique: true }),
            mongoose.connection.collection('questions').createIndex({ isActive: 1 }),
            mongoose.connection.collection('nominees').createIndex({ votes: -1 }),
            mongoose.connection.collection('traffic').createIndex({ timestamp: -1 }),
            mongoose.connection.collection('sessions').createIndex({ sessionId: 1 })
        ]);

        console.log('✅ MongoDB Connected');
        
        // Handle connection events
        mongoose.connection.on('error', err => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });

    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        // Retry connection after delay
        setTimeout(connectDatabase, 5000);
    }
};

export default connectDatabase; 