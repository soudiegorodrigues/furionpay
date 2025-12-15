/**
 * Image Compression Utility
 * Compresses images before upload to reduce file size and improve performance
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'webp' | 'png';
}

const defaultOptions: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  format: 'webp',
};

/**
 * Compresses an image file and returns a new compressed Blob
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  const opts = { ...defaultOptions, ...options };
  
  // Skip compression for non-image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip compression for small files (< 100KB)
  if (file.size < 100 * 1024) {
    return file;
  }

  // Skip compression for GIFs (to preserve animation)
  if (file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      try {
        // Calculate new dimensions while preserving aspect ratio
        let { width, height } = img;
        const maxW = opts.maxWidth!;
        const maxH = opts.maxHeight!;

        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image with white background (for transparency handling)
        if (ctx) {
          // Fill with white for non-transparent formats
          if (opts.format === 'jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }
          ctx.drawImage(img, 0, 0, width, height);
        }

        // Convert to blob
        const mimeType = `image/${opts.format}`;
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // If compressed is larger than original, return original
              if (blob.size >= file.size) {
                resolve(file);
              } else {
                console.log(`[ImageCompression] ${file.name}: ${formatFileSize(file.size)} → ${formatFileSize(blob.size)} (${Math.round((1 - blob.size / file.size) * 100)}% reduction)`);
                resolve(blob);
              }
            } else {
              resolve(file);
            }
          },
          mimeType,
          opts.quality
        );
      } catch (error) {
        console.error('[ImageCompression] Error:', error);
        resolve(file); // Return original on error
      }
    };

    img.onerror = () => {
      console.error('[ImageCompression] Failed to load image');
      resolve(file); // Return original on error
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve(file);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image file and returns a new File object with the same name
 */
export async function compressImageToFile(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...defaultOptions, ...options };
  const blob = await compressImage(file, opts);
  
  // Generate new filename with correct extension
  const extension = opts.format || 'webp';
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const newFileName = `${baseName}.${extension}`;
  
  return new File([blob], newFileName, {
    type: `image/${extension}`,
    lastModified: Date.now(),
  });
}

/**
 * Format file size for logging
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/**
 * Preset configurations for different use cases
 */
export const compressionPresets = {
  // For product images, logos - high quality
  product: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.85,
    format: 'webp' as const,
  },
  // For thumbnails - smaller size
  thumbnail: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.75,
    format: 'webp' as const,
  },
  // For banners - wider images
  banner: {
    maxWidth: 1920,
    maxHeight: 600,
    quality: 0.8,
    format: 'webp' as const,
  },
  // For document uploads (KYC) - preserve quality
  document: {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.9,
    format: 'jpeg' as const,
  },
  // For avatar/profile - small but crisp
  avatar: {
    maxWidth: 256,
    maxHeight: 256,
    quality: 0.85,
    format: 'webp' as const,
  },
};
