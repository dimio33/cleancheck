import sharp from 'sharp';
import crypto from 'crypto';

// ============================================================
// Types
// ============================================================

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
  scores?: {
    drawing: number;
    hentai: number;
    neutral: number;
    porn: number;
    sexy: number;
  };
}

interface FileInfo {
  mimetype: string;
  size: number;
}

// ============================================================
// Constants
// ============================================================

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MIN_DIMENSION = 100;
const MAX_DIMENSION = 8000;

// NSFW thresholds
const PORN_THRESHOLD = 0.3;
const HENTAI_THRESHOLD = 0.3;
const SEXY_THRESHOLD = 0.5;

// ============================================================
// Module state — lazy-loaded NSFW model
// ============================================================

let nsfwModel: any = null;
let modelLoadFailed = false;

// ============================================================
// Public API
// ============================================================

/**
 * Pre-load the NSFW.js model so first request is not slow.
 * Call once at server startup; gracefully degrades if model fails.
 */
export async function initModeration(): Promise<void> {
  try {
    // Dynamic imports so the server starts even if these packages
    // are missing or the model download fails.
    const tf = await import('@tensorflow/tfjs');
    const nsfwjs = await import('nsfwjs');

    // Use the default hosted model (MobileNetV2 Mid)
    nsfwModel = await nsfwjs.load();
    console.log('NSFW moderation model loaded successfully');
  } catch (err) {
    modelLoadFailed = true;
    console.warn(
      'WARNING: NSFW moderation model failed to load. Image uploads will still be allowed but not scanned.',
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Layer 1 — basic file-type / file-size validation.
 */
export function validateImageFile(file: FileInfo): { valid: boolean; reason?: string } {
  if (!ALLOWED_MIMETYPES.includes(file.mimetype.toLowerCase())) {
    return {
      valid: false,
      reason: `File type not allowed. Accepted types: jpg, png, webp, heic. Got: ${file.mimetype}`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      reason: `File too large. Maximum size is 10 MB. Got: ${(file.size / 1024 / 1024).toFixed(1)} MB`,
    };
  }

  if (file.size === 0) {
    return { valid: false, reason: 'File is empty' };
  }

  return { valid: true };
}

/**
 * Layer 2 — run NSFW.js classification on the image buffer.
 * Returns allowed=true if image passes, allowed=false with reason
 * if flagged. Gracefully allows if model is unavailable.
 */
export async function moderateImage(
  buffer: Buffer,
  mimetype: string
): Promise<ModerationResult> {
  // --- Dimension check via sharp ---
  try {
    const metadata = await sharp(buffer).metadata();
    const { width, height } = metadata;

    if (width && height) {
      if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
        return {
          allowed: false,
          reason: `Image too small. Minimum dimensions: ${MIN_DIMENSION}x${MIN_DIMENSION}. Got: ${width}x${height}`,
        };
      }
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        return {
          allowed: false,
          reason: `Image too large. Maximum dimensions: ${MAX_DIMENSION}x${MAX_DIMENSION}. Got: ${width}x${height}`,
        };
      }
    }
  } catch (err) {
    console.warn('Could not read image dimensions:', err instanceof Error ? err.message : err);
    // Allow through — dimension check is best-effort
  }

  // --- NSFW classification ---
  if (!nsfwModel) {
    if (modelLoadFailed) {
      console.warn('Skipping NSFW check — model not available');
    }
    return { allowed: true };
  }

  try {
    const tf = await import('@tensorflow/tfjs');

    // Convert buffer to raw pixel data via sharp (resize to 224x224 for the model)
    const { data, info } = await sharp(buffer)
      .resize(224, 224, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Create a 3D tensor [height, width, channels]
    const tensor = tf.tensor3d(
      new Uint8Array(data),
      [info.height, info.width, info.channels as number],
      'int32'
    );

    const predictions = await nsfwModel.classify(tensor);
    tensor.dispose();

    // Convert array to keyed object
    const scoreMap: Record<string, number> = {};
    for (const p of predictions) {
      scoreMap[p.className.toLowerCase()] = p.probability;
    }

    const scores = {
      drawing: scoreMap['drawing'] ?? 0,
      hentai: scoreMap['hentai'] ?? 0,
      neutral: scoreMap['neutral'] ?? 0,
      porn: scoreMap['porn'] ?? 0,
      sexy: scoreMap['sexy'] ?? 0,
    };

    // Check thresholds
    if (scores.porn > PORN_THRESHOLD) {
      return {
        allowed: false,
        reason: 'Image flagged as inappropriate content (explicit)',
        scores,
      };
    }
    if (scores.hentai > HENTAI_THRESHOLD) {
      return {
        allowed: false,
        reason: 'Image flagged as inappropriate content (illustration)',
        scores,
      };
    }
    if (scores.sexy > SEXY_THRESHOLD) {
      return {
        allowed: false,
        reason: 'Image flagged as inappropriate content (suggestive)',
        scores,
      };
    }

    return { allowed: true, scores };
  } catch (err) {
    console.warn(
      'NSFW classification failed — allowing image through:',
      err instanceof Error ? err.message : err
    );
    return { allowed: true };
  }
}

/**
 * Layer 3 — generate a perceptual hash of the image using sharp.
 * Returns a hex string that can be stored in the DB.
 * Similar images produce the same (or very similar) hashes.
 */
export async function generateImageHash(buffer: Buffer): Promise<string> {
  // Resize to a tiny grayscale image, then hash the raw pixel data.
  // This acts as a simple perceptual hash (pHash-like).
  const rawPixels = await sharp(buffer)
    .resize(16, 16, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer();

  // Compute average luminance
  let sum = 0;
  for (let i = 0; i < rawPixels.length; i++) {
    sum += rawPixels[i];
  }
  const avg = sum / rawPixels.length;

  // Build a binary string: 1 if pixel >= avg, 0 otherwise
  let bits = '';
  for (let i = 0; i < rawPixels.length; i++) {
    bits += rawPixels[i] >= avg ? '1' : '0';
  }

  // Convert binary string to hex
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.substring(i, i + 4), 2).toString(16);
  }

  return hex;
}
