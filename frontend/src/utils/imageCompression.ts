/**
 * Image Compression and Validation Utility for Low-Cost Android & 4G Mobile Networks
 * Downscales multi-megapixel camera photos on client-side before network upload.
 * Preserves clinical mucosal texture, lesion margins, and text clarity.
 */

export interface CompressionResult {
  file: File;
  previewUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatioPercent: number;
  width: number;
  height: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  errorTe?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_RAW_SIZE_BYTES = 25 * 1024 * 1024; // 25MB safety max for raw camera uploads

export function validateMedicalImage(file: File): ValidationResult {
  if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload JPEG, PNG, or WebP images.',
      errorTe: 'చెల్లని ఫైల్ ఫార్మాట్. దయచేసి JPEG, PNG లేదా WebP ఫోటోలను మాత్రమే అప్‌లోడ్ చేయండి.'
    };
  }

  if (file.size > MAX_RAW_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File size exceeds 25MB limit. Please capture or select a smaller image.',
      errorTe: 'ఫైల్ పరిమాణం 25MB కంటే ఎక్కువ ఉంది. దయచేసి చిన్న చిత్రాన్ని ఎంచుకోండి.'
    };
  }

  return { valid: true };
}

/**
 * Compress an image file using browser HTML5 Canvas.
 * Optimized for low-bandwidth 4G rural networks in tribal mandals.
 *
 * @param file The original image File from camera or file input
 * @param maxDimension Max width or height (default 1600px for clinical clarity)
 * @param quality JPEG compression quality (0.88 provides great detail at ~500KB)
 */
export async function compressMedicalImage(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.88
): Promise<CompressionResult> {
  const originalSizeBytes = file.size;

  // If already under 600KB and JPEG/WebP, return as is with object URL
  if (file.size < 600 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/webp')) {
    const previewUrl = URL.createObjectURL(file);
    return {
      file,
      previewUrl,
      originalSizeBytes,
      compressedSizeBytes: file.size,
      compressionRatioPercent: 0,
      width: 0,
      height: 0
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image data'));
      img.onload = () => {
        let { width, height } = img;

        // Calculate proportional scale
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Unable to create 2D canvas context'));
          return;
        }

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed'));
              return;
            }

            const cleanFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], cleanFileName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            const compressedSizeBytes = compressedFile.size;
            const compressionRatioPercent = Math.round(
              ((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100
            );
            const previewUrl = URL.createObjectURL(compressedFile);

            resolve({
              file: compressedFile,
              previewUrl,
              originalSizeBytes,
              compressedSizeBytes,
              compressionRatioPercent: Math.max(0, compressionRatioPercent),
              width,
              height
            });
          },
          'image/jpeg',
          quality
        );
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
