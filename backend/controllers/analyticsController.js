import { Traffic, QuestionAnalytics, SessionAnalytics, SystemAnalytics } from '../models/Analytics.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import Nominee from '../models/Nominee.js';

// Get comprehensive analytics dashboard data
export const getDashboardAnalytics = async (req, res) => {
    try {
        const { range = '7d' } = req.query;
        const days = parseInt(range.replace('d', ''));
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Get overall statistics
        const [
            totalUsers,
            totalQuestions,
            totalVotes,
            totalSessions,
            recentTraffic,
            questionAnalytics,
            topQuestions
        ] = await Promise.all([
            User.countDocuments(),
            Question.countDocuments(),
            Nominee.aggregate([{ $group: { _id: null, total: { $sum: '$votes' } } }]),
            SessionAnalytics.countDocuments(),
            Traffic.find({ timestamp: { $gte: startDate } })
                .sort({ timestamp: -1 })
                .limit(1000),
            QuestionAnalytics.find().populate('questionId'),
            QuestionAnalytics.find()
                .populate('questionId')
                .sort({ views: -1, votes: -1 })
                .limit(5)
        ]);

        // Process traffic data for charts
        const hourlyTraffic = processHourlyTraffic(recentTraffic, days);
        const actionBreakdown = processActionBreakdown(recentTraffic);
        const dailyStats = processDailyStats(recentTraffic, days);

        // Calculate engagement metrics
        const engagementMetrics = await calculateEngagementMetrics(startDate);

        // Question performance metrics
        const questionPerformance = questionAnalytics.map(qa => ({
            id: qa.questionId?._id,
            title: qa.questionId?.title || 'Unknown Question',
            views: qa.views,
            clicks: qa.clicks,
            votes: qa.votes,
            conversionRate: qa.conversionRate,
            uniqueViews: qa.uniqueViews,
            trendData: qa.dailyStats.slice(-7) // Last 7 days
        }));

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    totalQuestions,
                    totalVotes: totalVotes[0]?.total || 0,
                    totalSessions,
                    dateRange: { start: startDate, end: new Date() }
                },
                traffic: {
                    hourly: hourlyTraffic,
                    daily: dailyStats,
                    actions: actionBreakdown
                },
                engagement: engagementMetrics,
                questions: {
                    performance: questionPerformance,
                    topPerforming: topQuestions.map(q => ({
                        id: q.questionId?._id,
                        title: q.questionId?.title || 'Unknown',
                        views: q.views,
                        votes: q.votes,
                        conversionRate: q.conversionRate
                    }))
                },
                realTime: {
                    activeUsers: await getActiveUsers(),
                    recentActions: recentTraffic.slice(0, 10).map(t => ({
                        action: t.action,
                        page: t.page,
                        timestamp: t.timestamp,
                        userId: t.userId
                    }))
                }
            }
        });

    } catch (error) {
        console.error('Dashboard analytics error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get specific question analytics
export const getQuestionAnalytics = async (req, res) => {
    try {
        const { questionId } = req.params;
        const { range = '30d' } = req.query;
        
        const days = parseInt(range.replace('d', ''));
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const [questionAnalytics, question, recentViews] = await Promise.all([
            QuestionAnalytics.findOne({ questionId }).populate('questionId'),
            Question.findById(questionId).populate('nominees'),
            Traffic.find({
                'metadata.questionId': questionId,
                timestamp: { $gte: startDate }
            }).sort({ timestamp: -1 })
        ]);

        if (!questionAnalytics || !question) {
            return res.status(404).json({
                success: false,
                error: 'Question not found'
            });
        }

        // Calculate nominee performance
        const nomineePerformance = question.nominees.map(nominee => ({
            id: nominee._id,
            name: nominee.name,
            votes: nominee.votes,
            percentage: question.nominees.reduce((sum, n) => sum + n.votes, 0) > 0 
                ? (nominee.votes / question.nominees.reduce((sum, n) => sum + n.votes, 0)) * 100 
                : 0
        }));

        // Process time-series data
        const timeSeriesData = processQuestionTimeSeries(questionAnalytics.dailyStats, days);

        res.json({
            success: true,
            data: {
                question: {
                    id: question._id,
                    title: question.title,
                    description: question.description,
                    isActive: question.isActive,
                    startTime: question.startTime,
                    endTime: question.endTime
                },
                analytics: {
                    views: questionAnalytics.views,
                    clicks: questionAnalytics.clicks,
                    votes: questionAnalytics.votes,
                    uniqueViews: questionAnalytics.uniqueViews,
                    conversionRate: questionAnalytics.conversionRate,
                    lastUpdated: questionAnalytics.lastUpdated
                },
                performance: {
                    nominees: nomineePerformance,
                    timeSeries: timeSeriesData,
                    totalVotes: question.nominees.reduce((sum, n) => sum + n.votes, 0)
                },
                insights: generateQuestionInsights(questionAnalytics, nomineePerformance)
            }
        });

    } catch (error) {
        console.error('Question analytics error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get real-time analytics
export const getRealTimeAnalytics = async (req, res) => {
    try {
        const last15Minutes = new Date(Date.now() - 15 * 60 * 1000);
        const lastHour = new Date(Date.now() - 60 * 60 * 1000);

        const [
            activeUsers,
            recentActions,
            liveVotes,
            currentSessions
        ] = await Promise.all([
            getActiveUsers(),
            Traffic.find({ timestamp: { $gte: last15Minutes } })
                .sort({ timestamp: -1 })
                .limit(20),
            Traffic.find({ 
                action: 'vote_cast',
                timestamp: { $gte: lastHour }
            }).populate('userId', 'email'),
            SessionAnalytics.find({
                startTime: { $gte: lastHour },
                endTime: { $exists: false }
            }).countDocuments()
        ]);

        res.json({
            success: true,
            data: {
                activeUsers,
                activeSessions: currentSessions,
                recentActions: recentActions.map(action => ({
                    action: action.action,
                    page: action.page,
                    timestamp: action.timestamp,
                    userEmail: action.userId?.email || 'Anonymous'
                })),
                liveVotes: liveVotes.map(vote => ({
                    timestamp: vote.timestamp,
                    userEmail: vote.userId?.email || 'Anonymous',
                    questionId: vote.metadata?.get('questionId')
                })),
                lastUpdated: new Date()
            }
        });

    } catch (error) {
        console.error('Real-time analytics error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Helper functions
const processHourlyTraffic = (traffic, days) => {
    const hourlyData = {};
    const now = new Date();
    
    // Initialize all hours for the range
    for (let i = 0; i < days * 24; i++) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        const key = hour.toISOString().slice(0, 13);
        hourlyData[key] = 0;
    }
    
    // Count traffic by hour
    traffic.forEach(t => {
        const hourKey = t.timestamp.toISOString().slice(0, 13);
        if (hourlyData.hasOwnProperty(hourKey)) {
            hourlyData[hourKey]++;
        }
    });
    
    return Object.entries(hourlyData)
        .sort()
        .map(([hour, count]) => ({
            hour: new Date(hour).getHours(),
            timestamp: hour,
            count
        }));
};

const processActionBreakdown = (traffic) => {
    const actionCounts = {};
    traffic.forEach(t => {
        actionCounts[t.action] = (actionCounts[t.action] || 0) + 1;
    });
    
    return Object.entries(actionCounts).map(([action, count]) => ({
        action,
        count,
        percentage: (count / traffic.length) * 100
    }));
};

const processDailyStats = (traffic, days) => {
    const dailyData = {};
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = date.toISOString().slice(0, 10);
        dailyData[key] = { views: 0, votes: 0, users: new Set() };
    }
    
    traffic.forEach(t => {
        const dateKey = t.timestamp.toISOString().slice(0, 10);
        if (dailyData[dateKey]) {
            if (t.action === 'page_view') dailyData[dateKey].views++;
            if (t.action === 'vote_cast') dailyData[dateKey].votes++;
            if (t.userId) dailyData[dateKey].users.add(t.userId.toString());
        }
    });
    
    return Object.entries(dailyData)
        .sort()
        .map(([date, data]) => ({
            date,
            views: data.views,
            votes: data.votes,
            uniqueUsers: data.users.size
        }));
};

const calculateEngagementMetrics = async (startDate) => {
    const sessions = await SessionAnalytics.find({
        startTime: { $gte: startDate }
    });
    
    const totalSessions = sessions.length;
    const bounces = sessions.filter(s => s.pageViews <= 1).length;
    const avgDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / totalSessions;
    
    return {
        totalSessions,
        bounceRate: totalSessions > 0 ? (bounces / totalSessions) * 100 : 0,
        averageSessionDuration: Math.round(avgDuration),
        pagesPerSession: sessions.reduce((sum, s) => sum + s.pageViews, 0) / totalSessions || 0
    };
};

const getActiveUsers = async () => {
    const last15Minutes = new Date(Date.now() - 15 * 60 * 1000);
    return await Traffic.distinct('userId', {
        timestamp: { $gte: last15Minutes },
        userId: { $ne: null }
    }).then(users => users.length);
};

const processQuestionTimeSeries = (dailyStats, days) => {
    return dailyStats.slice(-days).map(stat => ({
        date: stat.date,
        views: stat.views,
        clicks: stat.clicks,
        votes: stat.votes
    }));
};

const generateQuestionInsights = (analytics, nominees) => {
    const insights = [];
    
    if (analytics.conversionRate > 20) {
        insights.push('High conversion rate - users are highly engaged');
    } else if (analytics.conversionRate < 5) {
        insights.push('Low conversion rate - consider improving question clarity');
    }
    
    const topNominee = nominees.reduce((max, nominee) => 
        nominee.votes > max.votes ? nominee : max, nominees[0]);
    
    if (topNominee && topNominee.percentage > 60) {
        insights.push(`${topNominee.name} is leading by a significant margin`);
    }
    
    return insights;
}; 