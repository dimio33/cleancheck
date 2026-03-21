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
  visionFlags?: string[];
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

// Google Vision SafeSearch — block LIKELY and VERY_LIKELY
const VISION_BLOCK_LEVELS = ['LIKELY', 'VERY_LIKELY'];

// Blocked text patterns in OCR (case-insensitive)
const BLOCKED_TEXT_PATTERNS = [
  /fuck/i, /shit/i, /dick/i, /penis/i, /pussy/i, /nazi/i,
  /heil\s*hitler/i, /arsch/i, /fotze/i, /hurensohn/i, /wichser/i,
  /nigger/i, /faggot/i,
];

// ============================================================
// Module state
// ============================================================

let nsfwModel: any = null;
let modelLoadFailed = false;
let modelLoadError: string | null = null;

/**
 * Check if content moderation is operational.
 */
export function getModerationStatus(): {
  nsfw: { ready: boolean; error: string | null };
  vision: { ready: boolean; error: string | null };
} {
  const visionKey = process.env.GOOGLE_VISION_API_KEY;
  return {
    nsfw: nsfwModel
      ? { ready: true, error: null }
      : { ready: false, error: modelLoadError || 'Model not yet loaded' },
    vision: visionKey
      ? { ready: true, error: null }
      : { ready: false, error: 'GOOGLE_VISION_API_KEY not set' },
  };
}

// ============================================================
// Public API
// ============================================================

/**
 * Pre-load the NSFW.js model so first request is not slow.
 */
export async function initModeration(): Promise<void> {
  try {
    const tf = await import('@tensorflow/tfjs');
    const nsfwjs = await import('nsfwjs');
    nsfwModel = await nsfwjs.load();
    console.log('NSFW moderation model loaded successfully');
  } catch (err) {
    modelLoadFailed = true;
    modelLoadError = err instanceof Error ? err.message : String(err);
    console.error(
      'CRITICAL: NSFW moderation model failed to load.',
      modelLoadError
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
 */
async function classifyNsfw(buffer: Buffer): Promise<ModerationResult> {
  if (!nsfwModel) {
    if (modelLoadFailed) {
      console.error('STRICT MODE: NSFW model not available');
      return { allowed: false, reason: 'Content moderation is temporarily unavailable. Please try again later.' };
    }
    return { allowed: false, reason: 'Content moderation is initializing. Please try again in a moment.' };
  }

  try {
    const tf = await import('@tensorflow/tfjs');

    const { data, info } = await sharp(buffer)
      .resize(224, 224, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const tensor = tf.tensor3d(
      new Uint8Array(data),
      [info.height, info.width, info.channels as number],
      'int32'
    );

    const predictions = await nsfwModel.classify(tensor);
    tensor.dispose();

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

    if (scores.porn > PORN_THRESHOLD) {
      return { allowed: false, reason: 'Image flagged as inappropriate content (explicit)', scores };
    }
    if (scores.hentai > HENTAI_THRESHOLD) {
      return { allowed: false, reason: 'Image flagged as inappropriate content (illustration)', scores };
    }
    if (scores.sexy > SEXY_THRESHOLD) {
      return { allowed: false, reason: 'Image flagged as inappropriate content (suggestive)', scores };
    }

    return { allowed: true, scores };
  } catch (err) {
    // STRICT: if classification fails, block the upload
    console.error('NSFW classification failed:', err instanceof Error ? err.message : err);
    return { allowed: false, reason: 'Content moderation check failed. Please try again.' };
  }
}

/**
 * Layer 3 — Google Cloud Vision API (SafeSearch + Face Detection + OCR).
 * Requires GOOGLE_VISION_API_KEY env var.
 */
async function classifyVision(buffer: Buffer): Promise<ModerationResult> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    // Vision not configured — skip this layer (NSFW.js is primary)
    return { allowed: true };
  }

  try {
    const base64Image = buffer.toString('base64');

    const requestBody = {
      requests: [{
        image: { content: base64Image },
        features: [
          { type: 'SAFE_SEARCH_DETECTION' },
          { type: 'FACE_DETECTION', maxResults: 5 },
          { type: 'TEXT_DETECTION', maxResults: 1 },
        ],
      }],
    };

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      console.error(`Google Vision API error: ${response.status} ${response.statusText}`);
      // Don't block on Vision API failure if NSFW.js already passed
      return { allowed: true };
    }

    const data = await response.json() as {
      responses: [{
        safeSearchAnnotation?: {
          adult: string;
          violence: string;
          racy: string;
          medical: string;
        };
        faceAnnotations?: { detectionConfidence: number }[];
        textAnnotations?: { description: string }[];
      }]
    };

    const result = data.responses?.[0];
    if (!result) return { allowed: true };

    const flags: string[] = [];

    // --- SafeSearch ---
    const safeSearch = result.safeSearchAnnotation;
    if (safeSearch) {
      if (VISION_BLOCK_LEVELS.includes(safeSearch.adult)) {
        flags.push(`adult content (${safeSearch.adult})`);
      }
      if (VISION_BLOCK_LEVELS.includes(safeSearch.violence)) {
        flags.push(`violence (${safeSearch.violence})`);
      }
      if (VISION_BLOCK_LEVELS.includes(safeSearch.racy)) {
        flags.push(`racy content (${safeSearch.racy})`);
      }
    }

    // --- Face Detection ---
    const faces = result.faceAnnotations;
    if (faces && faces.length > 0) {
      // Photos of toilets shouldn't have faces — flag as privacy concern
      const confidentFaces = faces.filter(f => f.detectionConfidence > 0.8);
      if (confidentFaces.length > 0) {
        flags.push(`${confidentFaces.length} face(s) detected — privacy concern`);
      }
    }

    // --- OCR Text Detection ---
    const text = result.textAnnotations?.[0]?.description;
    if (text) {
      for (const pattern of BLOCKED_TEXT_PATTERNS) {
        if (pattern.test(text)) {
          flags.push(`offensive text detected`);
          break;
        }
      }
    }

    if (flags.length > 0) {
      return {
        allowed: false,
        reason: `Image blocked: ${flags.join(', ')}`,
        visionFlags: flags,
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error('Google Vision API call failed:', err instanceof Error ? err.message : err);
    // Don't block on Vision failure if NSFW.js passed
    return { allowed: true };
  }
}

/**
 * Full moderation pipeline — runs all layers.
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
  }

  // --- Layer 2: NSFW.js (local, fast) ---
  const nsfwResult = await classifyNsfw(buffer);
  if (!nsfwResult.allowed) return nsfwResult;

  // --- Layer 3: Google Vision (remote, comprehensive) ---
  const visionResult = await classifyVision(buffer);
  if (!visionResult.allowed) return visionResult;

  return { allowed: true, scores: nsfwResult.scores };
}

/**
 * Generate a perceptual hash of the image.
 */
export async function generateImageHash(buffer: Buffer): Promise<string> {
  const rawPixels = await sharp(buffer)
    .resize(16, 16, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer();

  let sum = 0;
  for (let i = 0; i < rawPixels.length; i++) {
    sum += rawPixels[i];
  }
  const avg = sum / rawPixels.length;

  let bits = '';
  for (let i = 0; i < rawPixels.length; i++) {
    bits += rawPixels[i] >= avg ? '1' : '0';
  }

  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.substring(i, i + 4), 2).toString(16);
  }

  return hex;
}
