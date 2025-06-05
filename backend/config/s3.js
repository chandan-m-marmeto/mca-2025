import AWS from 'aws-sdk';

// S3 Configuration
const s3Config = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET_NAME
};

// Initialize S3 client
const s3 = new AWS.S3({
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey,
    region: s3Config.region
});

// Upload file to S3
export const uploadToS3 = async (file, key) => {
    try {
        const params = {
            Bucket: s3Config.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
        };

        const result = await s3.upload(params).promise();
        return result.Location;
    } catch (error) {
        console.error('S3 upload error:', error);
        throw new Error('Failed to upload file to S3');
    }
};

// Generate S3 URL
export const getS3Url = (key) => {
    return `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${key}`;
};

// Delete file from S3
export const deleteFromS3 = async (key) => {
    try {
        const params = {
            Bucket: s3Config.bucket,
            Key: key
        };

        await s3.deleteObject(params).promise();
    } catch (error) {
        console.error('S3 delete error:', error);
        throw new Error('Failed to delete file from S3');
    }
};

export default s3Config; 