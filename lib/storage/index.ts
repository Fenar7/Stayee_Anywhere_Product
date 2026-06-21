import { createAdminClient } from "@/lib/auth/server";

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "nexthome-documents";

/**
 * Ensures that the private storage bucket exists in Supabase.
 */
export async function ensureBucketExists(): Promise<void> {
  const supabase = createAdminClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error("Failed to list storage buckets:", listError);
    return;
  }

  const exists = buckets.some((b) => b.name === BUCKET_NAME);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false, // Bucket must be private
      fileSizeLimit: 10 * 1024 * 1024, // 10MB limit
    });
    if (createError) {
      console.error(`Failed to create storage bucket "${BUCKET_NAME}":`, createError);
    }
  }
}

/**
 * Uploads a buffer to private Supabase storage.
 * @returns The storage path of the uploaded file.
 */
export async function uploadToStorage(
  buffer: Buffer,
  path: string,
  mimeType: string
): Promise<string> {
  const supabase = createAdminClient();
  await ensureBucketExists();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return data.path;
}

/**
 * Generates a short-lived signed URL for accessing a private document.
 */
export async function getSignedUrl(
  path: string,
  expiresInSeconds = 900 // Default to 15 minutes (900 seconds)
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}
