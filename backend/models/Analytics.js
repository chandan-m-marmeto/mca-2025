import mongoose from 'mongoose';

// Website Traffic Analytics
const trafficSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    userAgent: String,
    ip: String,
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    sessionId: String,
    page: String,
    action: {
        type: String,
        enum: ['page_view', 'login', 'logout', 'vote_cast', 'question_view', 'question_click']
    },
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Question Analytics
const questionAnalyticsSchema = new mongoose.Schema({
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true,
        index: true
    },
    views: {
        type: Number,
        default: 0
    },
    clicks: {
        type: Number,
        default: 0
    },
    votes: {
        type: Number,
        default: 0
    },
    uniqueViews: {
        type: Number,
        default: 0
    },
    uniqueVoters: {
        type: Number,
        default: 0
    },
    conversionRate: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    dailyStats: [{
        date: Date,
        views: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 },
        votes: { type: Number, default: 0 }
    }]
}, {
    timestamps: true
});

// User Session Analytics
const sessionAnalyticsSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: Date,
    duration: Number, // in seconds
    pageViews: {
        type: Number,
        default: 0
    },
    questionsViewed: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question'
        },
        viewedAt: {
            type: Date,
            default: Date.now
        },
        timeSpent: Number // in seconds
    }],
    votescast: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question'
        },
        nomineeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Nominee'
        },
        votedAt: {
            type: Date,
            default: Date.now
        }
    }],
    userAgent: String,
    ip: String
}, {
    timestamps: true
});

// System Analytics - Daily aggregated stats
const systemAnalyticsSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        index: true
    },
    totalUsers: Number,
    activeUsers: Number,
    newUsers: Number,
    totalSessions: Number,
    totalPageViews: Number,
    totalVotes: Number,
    averageSessionDuration: Number,
    bounceRate: Number,
    topQuestions: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question'
        },
        views: Number,
        votes: Number
    }],
    hourlyStats: [{
        hour: Number,
        users: Number,
        pageViews: Number,
        votes: Number
    }]
}, {
    timestamps: true
});

// Create indexes for better performance
trafficSchema.index({ timestamp: -1, action: 1 });
trafficSchema.index({ userId: 1, timestamp: -1 });
questionAnalyticsSchema.index({ questionId: 1 });
sessionAnalyticsSchema.index({ sessionId: 1, startTime: -1 });
systemAnalyticsSchema.index({ date: -1 });

const Traffic = mongoose.model('Traffic', trafficSchema);
const QuestionAnalytics = mongoose.model('QuestionAnalytics', questionAnalyticsSchema);
const SessionAnalytics = mongoose.model('SessionAnalytics', sessionAnalyticsSchema);
const SystemAnalytics = mongoose.model('SystemAnalytics', systemAnalyticsSchema);

export { Traffic, QuestionAnalytics, SessionAnalytics, SystemAnalytics }; 