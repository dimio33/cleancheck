import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_KEY_ID = process.env.R2_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'cleancheck-photos';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g. https://photos.cleancheck.e-findo.de

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (!s3Client) {
    if (!R2_ACCOUNT_ID || !R2_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 storage not configured. Set R2_ACCOUNT_ID, R2_KEY_ID, R2_SECRET_ACCESS_KEY');
    }
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_KEY_ID && R2_SECRET_ACCESS_KEY);
}

export async function uploadPhoto(
  buffer: Buffer,
  mimetype: string,
  ratingId: string
): Promise<string> {
  const ext = mimetype.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const hash = crypto.randomBytes(8).toString('hex');
  const key = `ratings/${ratingId}/${hash}.${ext}`;

  const client = getClient();
  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  }));

  // Return public URL if configured, otherwise the key
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }
  return key;
}

export async function deletePhoto(key: string): Promise<void> {
  // Extract key from full URL if needed
  const actualKey = R2_PUBLIC_URL && key.startsWith(R2_PUBLIC_URL)
    ? key.substring(R2_PUBLIC_URL.length + 1)
    : key;

  const client = getClient();
  await client.send(new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: actualKey,
  }));
}
