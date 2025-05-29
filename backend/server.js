import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDatabase from './config/database.js';
import analyticsRoutes from './routes/analytics.js';
import { generateSessionId, trackAction } from './middleware/analytics.js';
import session from 'express-session';

// Import routes
import authRoutes from './routes/auth.js';
import voteRoutes from './routes/vote.js';
import adminRoutes from './routes/admin.js';

// Get current directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const server = http.createServer(app);

// Trust proxy for nginx
app.set('trust proxy', 1);

// Frontend URL
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Connect to database
connectDatabase();

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Increase request size limits for file uploads (BEFORE routes)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Serve static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting - Fixed configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 200 : 10000,
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy: true // Add this for nginx
});
app.use('/api/', limiter);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('joinRoom', (questionId) => {
        socket.join(`question_${questionId}`);
    });

    socket.on('leaveRoom', (questionId) => {
        socket.leave(`question_${questionId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Make io available in routes
app.set('io', io);

// Session middleware for analytics
app.use(session({
    secret: process.env.SESSION_SECRET || 'mca-analytics-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true in production with HTTPS
}));

// Analytics session tracking
app.use(generateSessionId);

// Track page views (but not API routes to avoid spam)
app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) {
        trackAction('page_view')(req, res, next);
    } else {
        next();
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vote', voteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check route
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Handle Multer errors (file upload errors)
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            error: 'File too large. Maximum size is 20MB per file.'
        });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            error: 'Too many files uploaded or invalid field name.'
        });
    }
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }

    res.status(500).json({
        success: false,
        error: 'Something went wrong!'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 