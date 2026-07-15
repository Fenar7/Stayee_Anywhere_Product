import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getPresignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "staye-production-documents";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

/**
 * Ensures that the private storage bucket exists.
 * (No-op for AWS since the bucket was provisioned manually via IaC/Console)
 */
export async function ensureBucketExists(): Promise<void> {
  // Bucket is already provisioned in AWS
  return Promise.resolve();
}

/**
 * Uploads a buffer to private AWS S3 storage.
 * @returns The storage path of the uploaded file.
 */
export async function uploadToStorage(
  buffer: Buffer,
  path: string,
  mimeType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: path,
    Body: buffer,
    ContentType: mimeType,
  });

  try {
    await s3Client.send(command);
    return path;
  } catch (error: any) {
    throw new Error(`AWS S3 upload failed: ${error.message}`);
  }
}

/**
 * Generates a short-lived signed URL for accessing a private document.
 */
export async function getSignedUrl(
  path: string,
  expiresInSeconds = 900 // Default to 15 minutes (900 seconds)
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: path,
  });

  try {
    const signedUrl = await getPresignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    return signedUrl;
  } catch (error: any) {
    throw new Error(`Failed to generate AWS S3 signed URL: ${error.message}`);
  }
}
