import sharp from "sharp";

/**
 * Checks the magic bytes of a buffer to verify if it is a JPEG, PNG, or PDF file.
 * This prevents renamed malicious files (like .exe to .jpg) from being accepted.
 */
export function verifyAndGetFileType(buffer: Buffer): "jpg" | "png" | "pdf" | null {
  if (buffer.length < 4) return null;

  // PDF magic bytes: %PDF (25 50 44 46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "pdf";
  }

  // PNG magic bytes: 89 50 4e 47 0d 0a 1a 0a
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }

  // JPEG magic bytes: ff d8 ff
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "jpg";
  }

  return null;
}

/**
 * Compresses an image buffer based on its purpose.
 * Profile photos are compressed aggressively.
 * ID documents/receipts are compressed conservatively to preserve legibility.
 */
export async function compressImage(
  buffer: Buffer,
  purpose: "profile" | "document"
): Promise<{ data: Buffer; ext: "jpg"; mimeType: "image/jpeg" }> {
  let pipeline = sharp(buffer);

  if (purpose === "profile") {
    // Aggressive: limit size to 1000x1000, lower quality
    pipeline = pipeline
      .resize({
        width: 1000,
        height: 1000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 70, progressive: true });
  } else {
    // Conservative: no resize, higher quality for readability
    pipeline = pipeline.jpeg({ quality: 85, progressive: true });
  }

  const data = await pipeline.toBuffer();
  return {
    data,
    ext: "jpg",
    mimeType: "image/jpeg",
  };
}
