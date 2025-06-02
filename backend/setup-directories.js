#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🚀 Setting up directories for MCA 2025...');

const directories = [
    'uploads',
    'uploads/temp',
    'uploads/nominees'
];

directories.forEach(dir => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
            console.log(`✅ Created directory: ${dir}`);
        } else {
            console.log(`📁 Directory already exists: ${dir}`);
        }
        
        // Set permissions
        fs.chmodSync(dir, 0o755);
        console.log(`🔒 Set permissions for: ${dir}`);
        
    } catch (error) {
        console.error(`❌ Error with directory ${dir}:`, error.message);
    }
});

console.log('✨ Directory setup complete!'); 