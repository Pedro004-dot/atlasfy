/**
 * File Utilities
 * 
 * Collection of utility functions for file handling
 * Includes validation, optimization, and naming utilities
 */

/**
 * Validate image file
 */
export function validateImageFile(
  file: File,
  maxSizeBytes: number,
  allowedFormats: string[]
): string | null {
  // Check file size
  if (file.size > maxSizeBytes) {
    const maxSizeMB = maxSizeBytes / (1024 * 1024);
    return `Arquivo ${file.name} excede ${maxSizeMB}MB`;
  }

  // Check file type
  if (!allowedFormats.includes(file.type)) {
    const allowedExtensions = allowedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ');
    return `Formato de ${file.name} não suportado. Formatos aceitos: ${allowedExtensions}`;
  }

  // Check if file is actually an image by trying to read it
  if (!file.type.startsWith('image/')) {
    return `${file.name} não é um arquivo de imagem válido`;
  }

  return null; // Valid file
}

/**
 * Generate unique filename to avoid collisions
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const extension = getFileExtension(originalName);
  const nameWithoutExt = removeFileExtension(originalName);
  
  // Sanitize filename
  const sanitizedName = sanitizeFileName(nameWithoutExt);
  
  return `${sanitizedName}_${timestamp}_${random}.${extension}`;
}

/**
 * Optimize image file (compress if needed)
 */
export async function optimizeImageFile(file: File): Promise<File> {
  // For now, return the original file
  // In the future, we can add image compression here
  return file;
  
  // TODO: Implement image compression using canvas or a library like 'browser-image-compression'
  // Example implementation:
  /*
  if (file.size > 1024 * 1024) { // If larger than 1MB
    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true
    });
    return compressed;
  }
  return file;
  */
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.substring(lastDot + 1).toLowerCase();
}

/**
 * Remove file extension from filename
 */
export function removeFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? filename : filename.substring(0, lastDot);
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFileName(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '_') // Replace invalid chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 50); // Limit length
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(extension: string): string {
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'svg': 'image/svg+xml'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Check if file is an image by extension
 */
export function isImageFile(filename: string): boolean {
  const extension = getFileExtension(filename);
  const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
  return imageExtensions.includes(extension);
}

/**
 * Create thumbnail filename from original filename
 */
export function createThumbnailFileName(originalFileName: string): string {
  const nameWithoutExt = removeFileExtension(originalFileName);
  const extension = getFileExtension(originalFileName);
  
  return `${nameWithoutExt}_thumb.${extension}`;
}

/**
 * Extract product ID from image path
 * Example: "user123/company456/products/product789/images/image.jpg" -> "product789"
 */
export function extractProductIdFromPath(imagePath: string): string | null {
  const match = imagePath.match(/\/products\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Extract user ID from image path
 */
export function extractUserIdFromPath(imagePath: string): string | null {
  const parts = imagePath.split('/');
  return parts.length > 0 ? parts[0] : null;
}

/**
 * Extract company ID from image path
 */
export function extractCompanyIdFromPath(imagePath: string): string | null {
  const parts = imagePath.split('/');
  return parts.length > 1 ? parts[1] : null;
}