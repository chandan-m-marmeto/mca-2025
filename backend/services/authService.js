import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { validateEmail } from '../utils/validators.js';

class AuthService {
    // Register new user
    async register(userData) {
        const { email, password } = userData;

        if (!validateEmail(email)) {
            throw new Error('Invalid email format. Must be a @marmeto.com email');
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error('User already exists');
        }

        // Create new user
        const user = new User({
            email,
            password
        });

        await user.save();

        // Generate token
        const token = this.generateToken(user._id);

        return {
            user: {
                id: user._id,
                email: user.email,
                isAdmin: user.isAdmin
            },
            token
        };
    }

    // Login user
    async login(credentials) {
        const { email, password } = credentials;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        // Generate token
        const token = this.generateToken(user._id);

        return {
            user: {
                id: user._id,
                email: user.email,
                isAdmin: user.isAdmin
            },
            token
        };
    }

    // Get user by ID
    async getUserById(userId) {
        const user = await User.findById(userId).select('-password');
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    // Generate JWT token
    generateToken(userId) {
        return jwt.sign(
            { userId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
    }

    // Verify token
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            return decoded;
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    // Make user admin
    async makeAdmin(userId) {
        const user = await User.findByIdAndUpdate(
            userId,
            { isAdmin: true },
            { new: true }
        ).select('-password');

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }

    // Remove admin privileges
    async removeAdmin(userId) {
        const user = await User.findByIdAndUpdate(
            userId,
            { isAdmin: false },
            { new: true }
        ).select('-password');

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }
}

export default new AuthService(); 