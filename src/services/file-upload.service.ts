/**
 * File Upload Service - Supabase Storage Integration
 * 
 * Implements clean architecture with SOLID principles
 * Handles hierarchical file organization: user/company/product/images
 */

import { SupabaseStorageRepository } from '@/repositories/supabase-storage.repository';
import { generateUniqueFileName, validateImageFile, optimizeImageFile } from '@/lib/utils/file-utils';

export interface IFileUploadService {
  uploadProductImage(
    file: File, 
    userId: string, 
    companyId: string, 
    productId: string
  ): Promise<string>;
  
  deleteProductImage(imageUrl: string): Promise<void>;
  
  getProductImages(
    userId: string, 
    companyId: string, 
    productId: string
  ): Promise<string[]>;
  
  deleteAllProductImages(
    userId: string, 
    companyId: string, 
    productId: string
  ): Promise<void>;
}

export class FileUploadService implements IFileUploadService {
  private readonly bucket = 'uploads';
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedFormats = ['image/jpeg', 'image/png', 'image/webp'];

  constructor(
    private storageRepository: SupabaseStorageRepository
  ) {}

  /**
   * Upload product image with hierarchical organization
   * Path: uploads/{userId}/{companyId}/products/{productId}/images/{fileName}
   */
  async uploadProductImage(
    file: File,
    userId: string,
    companyId: string,
    productId: string
  ): Promise<string> {
    // 1. Validate file
    const validationError = validateImageFile(file, this.maxFileSize, this.allowedFormats);
    if (validationError) {
      throw new Error(validationError);
    }

    // 2. Optimize file (compress if needed)
    const optimizedFile = await optimizeImageFile(file);

    // 3. Generate unique filename
    const fileName = generateUniqueFileName(optimizedFile.name);

    // 4. Build hierarchical path
    const filePath = this.buildProductImagePath(userId, companyId, productId, fileName);

    // 5. Upload to Supabase Storage
    const publicUrl = await this.storageRepository.upload(this.bucket, filePath, optimizedFile);

    return publicUrl;
  }

  /**
   * Delete product image by URL
   */
  async deleteProductImage(imageUrl: string): Promise<void> {
    const filePath = this.extractFilePathFromUrl(imageUrl);
    if (!filePath) {
      throw new Error('Invalid image URL');
    }

    await this.storageRepository.delete(this.bucket, filePath);
  }

  /**
   * Get all images for a specific product
   */
  async getProductImages(
    userId: string,
    companyId: string,
    productId: string
  ): Promise<string[]> {
    const prefix = this.buildProductImagePrefix(userId, companyId, productId);
    return await this.storageRepository.list(this.bucket, prefix);
  }

  /**
   * Delete all images for a product (when product is deleted)
   */
  async deleteAllProductImages(
    userId: string,
    companyId: string,
    productId: string
  ): Promise<void> {
    const images = await this.getProductImages(userId, companyId, productId);
    
    // Delete all images in parallel
    const deletePromises = images.map(imageUrl => this.deleteProductImage(imageUrl));
    await Promise.all(deletePromises);
  }

  /**
   * Build hierarchical path for product image
   * Format: {userId}/{companyId}/products/{productId}/images/{fileName}
   */
  private buildProductImagePath(
    userId: string,
    companyId: string,
    productId: string,
    fileName: string
  ): string {
    return `${userId}/${companyId}/products/${productId}/images/${fileName}`;
  }

  /**
   * Build prefix for listing product images
   */
  private buildProductImagePrefix(
    userId: string,
    companyId: string,
    productId: string
  ): string {
    return `${userId}/${companyId}/products/${productId}/images/`;
  }

  /**
   * Extract file path from Supabase public URL
   */
  private extractFilePathFromUrl(url: string): string | null {
    try {
      const urlParts = url.split('/storage/v1/object/public/' + this.bucket + '/');
      return urlParts[1] || null;
    } catch {
      return null;
    }
  }
}

// Factory function following the Factory Pattern
export function createFileUploadService(): IFileUploadService {
  const storageRepository = new SupabaseStorageRepository();
  return new FileUploadService(storageRepository);
}