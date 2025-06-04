import { Traffic, QuestionAnalytics, SessionAnalytics } from '../models/Analytics.js';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

// Generate session ID if not exists
export const generateSessionId = (req, res, next) => {
    if (!req.session.sessionId) {
        req.session.sessionId = uuidv4();
    }
    req.sessionId = req.session.sessionId;
    next();
};

// Track page views and user actions
export const trackAction = (action) => {
    return async (req, res, next) => {
        try {
            const trackingData = {
                sessionId: req.sessionId || 'anonymous',
                userAgent: req.get('User-Agent'),
                ip: req.ip || req.connection.remoteAddress,
                userId: req.user?._id || null,
                page: req.originalUrl,
                action: action,
                metadata: new Map([
                    ['method', req.method],
                    ['params', req.params],
                    ['query', req.query]
                ])
            };

            await Traffic.create(trackingData);
            
            // Update session analytics
            await updateSessionAnalytics(req, action);
            
        } catch (error) {
            console.error('Analytics tracking error:', error);
            // Don't fail the request if analytics fails
        }
        next();
    };
};

// Track question views specifically
export const trackQuestionView = async (req, res, next) => {
    try {
        const questionId = req.params.id || req.params.questionId;
        if (questionId) {
            // Update question analytics
            await QuestionAnalytics.findOneAndUpdate(
                { questionId },
                { 
                    $inc: { views: 1 },
                    $push: {
                        dailyStats: {
                            $each: [{
                                date: new Date().setHours(0, 0, 0, 0),
                                views: 1
                            }],
                            $slice: -30 // Keep only last 30 days
                        }
                    },
                    lastUpdated: new Date()
                },
                { upsert: true }
            );

            // Track in session
            if (req.sessionId) {
                await SessionAnalytics.findOneAndUpdate(
                    { sessionId: req.sessionId },
                    {
                        $push: {
                            questionsViewed: {
                                questionId,
                                viewedAt: new Date()
                            }
                        },
                        $inc: { pageViews: 1 }
                    },
                    { upsert: true }
                );
            }
        }
    } catch (error) {
        console.error('Question view tracking error:', error);
    }
    next();
};

// Track votes
export const trackVote = async (req, res, next) => {
    try {
        const { questionId, nomineeId } = req.body;
        
        if (questionId) {
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // Update question analytics
                await QuestionAnalytics.findOneAndUpdate(
                    { questionId },
                    { 
                        $inc: { 
                            votes: 1,
                            uniqueVoters: 1
                        },
                        $push: {
                            dailyStats: {
                                $each: [{
                                    date: new Date().setHours(0, 0, 0, 0),
                                    votes: 1
                                }],
                                $slice: -30
                            }
                        },
                        $set: {
                            lastUpdated: new Date()
                        }
                    },
                    { upsert: true, session }
                );

                // Update conversion rate
                const analytics = await QuestionAnalytics.findOne({ questionId }).session(session);
                if (analytics) {
                    const conversionRate = (analytics.votes / Math.max(analytics.views, 1)) * 100;
                    await QuestionAnalytics.findOneAndUpdate(
                        { questionId },
                        { $set: { conversionRate } },
                        { session }
                    );
                }

                // Update session analytics
                if (req.sessionId) {
                    await SessionAnalytics.findOneAndUpdate(
                        { sessionId: req.sessionId },
                        {
                            $push: {
                                votescast: {
                                    questionId,
                                    nomineeId,
                                    votedAt: new Date()
                                }
                            }
                        },
                        { upsert: true, session }
                    );
                }

                await session.commitTransaction();
            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                session.endSession();
            }
        }
    } catch (error) {
        console.error('Vote tracking error:', error);
        // Log to monitoring service
        if (process.env.NODE_ENV === 'production') {
            // Implement proper error monitoring
            // e.g., Sentry.captureException(error);
        }
    }
    next();
};

// Update session analytics helper
const updateSessionAnalytics = async (req, action) => {
    if (!req.sessionId) return;

    const sessionData = {
        sessionId: req.sessionId,
        userId: req.user?._id || null,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress
    };

    if (action === 'page_view') {
        sessionData.$inc = { pageViews: 1 };
    }

    await SessionAnalytics.findOneAndUpdate(
        { sessionId: req.sessionId },
        sessionData,
        { upsert: true, setDefaultsOnInsert: true }
    );
};

// Calculate conversion rates
export const updateConversionRates = async () => {
    try {
        const questions = await QuestionAnalytics.find();
        
        for (const question of questions) {
            const conversionRate = question.views > 0 ? (question.votes / question.views) * 100 : 0;
            await QuestionAnalytics.findByIdAndUpdate(question._id, {
                conversionRate: Math.round(conversionRate * 100) / 100
            });
        }
    } catch (error) {
        console.error('Conversion rate update error:', error);
    }
}; 