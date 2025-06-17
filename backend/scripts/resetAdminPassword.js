import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const ADMIN_EMAIL = 'admin@marmeto.com';
const NEW_PASSWORD = ''; // You can change this to any secure password

async function resetAdminPassword() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mca2025');
        console.log('Connected to database');

        // Find admin user
        const admin = await User.findOne({ email: ADMIN_EMAIL });
        
        if (!admin) {
            console.log('❌ Admin user not found!');
            process.exit(1);
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

        // Update admin password
        await User.findByIdAndUpdate(admin._id, {
            password: hashedPassword
        });

        console.log('✅ Admin password reset successfully!');
        console.log('New login credentials:');
        console.log(`Email: ${ADMIN_EMAIL}`);
        console.log(`Password: ${NEW_PASSWORD}`);

    } catch (error) {
        console.error('❌ Error resetting password:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

resetAdminPassword();
