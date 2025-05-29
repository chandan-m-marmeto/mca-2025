import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import connectDatabase from '../config/database.js';

// Common password for all regular users
const COMMON_PASSWORD = 'MCA@2025';

// Admin credentials
const ADMIN_EMAIL = 'admin@marmeto.com';
const ADMIN_PASSWORD = 'Marmeto@123';

async function seedUsers() {
    try {
        // Connect to database
        await connectDatabase();
        console.log('Connected to MongoDB');

        // Clear existing users (optional - remove if you want to keep existing)
        await User.deleteMany({});
        console.log('Cleared existing users');

        // Create admin user
        const adminUser = new User({
            name: 'Admin',
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        await adminUser.save();
        console.log('✅ Admin user created:', ADMIN_EMAIL);

        // You can add your user list here
        // For now, I'll create some sample users
        const sampleUsers = [
            'john.doe@marmeto.com',
            'jane.smith@marmeto.com',
            'mike.johnson@marmeto.com',
            'sarah.wilson@marmeto.com',
            'david.brown@marmeto.com',
            // Add your 200 users here...
        ];

        // Create regular users with common password
        const userPromises = sampleUsers.map(email => {
            const name = email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
            return new User({
                name,
                email,
                password: COMMON_PASSWORD
            }).save();
        });

        await Promise.all(userPromises);
        console.log(`✅ Created ${sampleUsers.length} regular users with common password: ${COMMON_PASSWORD}`);

        console.log('\n🎉 Seeding completed!');
        console.log('\nLogin credentials:');
        console.log(`👨‍💼 Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
        console.log(`👥 Users: any-email@marmeto.com / ${COMMON_PASSWORD}`);

        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedUsers(); 