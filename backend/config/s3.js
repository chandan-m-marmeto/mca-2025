import AWS from 'aws-sdk';
import fs from 'fs';
import 'dotenv/config';

// Log environment variables (redacted for security)
console.log('🔧 S3 Configuration Check:');
console.log('- AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Present' : '❌ Missing');
console.log('- AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Present' : '❌ Missing');
console.log('- AWS_REGION:', process.env.AWS_REGION || '❌ Missing (will use default)');
console.log('- S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME || '❌ Missing');

// S3 Configuration with validation
const s3Config = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET_NAME
};

// Validate required environment variables
const requiredEnvVars = {
    AWS_ACCESS_KEY_ID: s3Config.accessKeyId,
    AWS_SECRET_ACCESS_KEY: s3Config.secretAccessKey,
    S3_BUCKET_NAME: s3Config.bucket
};

Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value) {
        console.error(`❌ Missing required environment variable: ${key}`);
    }
});

// Initialize S3 client with error handling
const s3 = new AWS.S3({
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey,
    region: s3Config.region,
    params: {
        Bucket: s3Config.bucket
    }
});

// Test S3 connection
const testS3Connection = async () => {
    try {
        await s3.headBucket({ Bucket: s3Config.bucket }).promise();
        console.log('✅ Successfully connected to S3 bucket:', s3Config.bucket);
    } catch (error) {
        console.error('❌ Failed to connect to S3:', error.message);
        if (error.code === 'NotFound') {
            console.error('The specified bucket does not exist');
        } else if (error.code === 'Forbidden') {
            console.error('Permissions issue - check your AWS credentials and bucket policies');
        }
    }
};

// Run the test
testS3Connection().catch(console.error);

// Upload file to S3 with enhanced error handling
export const uploadToS3 = async (file, key) => {
    try {
        // Validate bucket name
        if (!s3Config.bucket) {
            throw new Error('S3 bucket name is not configured. Please set S3_BUCKET_NAME environment variable.');
        }

        let fileBuffer;
        
        // If file is a buffer, use it directly
        if (file.buffer) {
            fileBuffer = file.buffer;
        } 
        // If file has a path, read it into a buffer
        else if (file.path) {
            fileBuffer = await fs.promises.readFile(file.path);
        } else {
            throw new Error('File must have either buffer or path property');
        }

        const params = {
            Bucket: s3Config.bucket,
            Key: key,
            Body: fileBuffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
        };

        console.log('📤 Uploading to S3 with params:', {
            Bucket: params.Bucket,
            Key: params.Key,
            ContentType: params.ContentType,
            FileSize: fileBuffer.length
        });

        const result = await s3.upload(params).promise();
        console.log('✅ S3 upload successful:', result.Location);
        return result.Location;
    } catch (error) {
        console.error('❌ S3 upload error:', error.message);
        if (error.code === 'MissingRequiredParameter') {
            console.error('Current S3 config:', {
                bucket: s3Config.bucket,
                region: s3Config.region,
                hasAccessKey: !!s3Config.accessKeyId,
                hasSecretKey: !!s3Config.secretAccessKey
            });
        }
        throw new Error('Failed to upload file to S3: ' + error.message);
    }
};

// Generate S3 URL
export const getS3Url = (key) => {
    if (!s3Config.bucket) {
        throw new Error('S3 bucket name is not configured');
    }
    return `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${key}`;
};

// Delete file from S3
export const deleteFromS3 = async (key) => {
    try {
        if (!s3Config.bucket) {
            throw new Error('S3 bucket name is not configured');
        }

        const params = {
            Bucket: s3Config.bucket,
            Key: key
        };

        await s3.deleteObject(params).promise();
        console.log('✅ File deleted from S3:', key);
    } catch (error) {
        console.error('❌ S3 delete error:', error);
        throw new Error('Failed to delete file from S3: ' + error.message);
    }
};

export default s3Config; 