/**
 * Supabase Storage Repository
 * 
 * Implements Repository Pattern for Supabase Storage operations
 * Abstraction layer between service and Supabase SDK
 */

import { databaseService } from '@/lib/database';

export interface ISupabaseStorageRepository {
  upload(bucket: string, path: string, file: File): Promise<string>;
  delete(bucket: string, path: string): Promise<void>;
  list(bucket: string, prefix: string): Promise<string[]>;
  getPublicUrl(bucket: string, path: string): string;
}

export class SupabaseStorageRepository implements ISupabaseStorageRepository {
  private get client() {
    return databaseService.getClient();
  }

  /**
   * Upload file to Supabase Storage
   * Returns the public URL of the uploaded file
   */
  async upload(bucket: string, path: string, file: File): Promise<string> {
    try {
      // Upload file to Supabase Storage
      const { data, error } = await this.client.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600', // Cache for 1 hour
          upsert: false // Don't overwrite existing files
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const publicUrl = this.getPublicUrl(bucket, path);
      return publicUrl;

    } catch (error) {
      console.error('Storage upload error:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete file from Supabase Storage
   */
  async delete(bucket: string, path: string): Promise<void> {
    try {
      const { error } = await this.client.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }

    } catch (error) {
      console.error('Storage delete error:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List files in a specific folder/prefix
   * Returns array of public URLs
   */
  async list(bucket: string, prefix: string): Promise<string[]> {
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .list(prefix, {
          limit: 100, // Limit to 100 images per product
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        throw new Error(`List failed: ${error.message}`);
      }

      // Convert to public URLs
      return data
        .filter(file => file.name && !file.name.endsWith('/')) // Filter out folders
        .map(file => this.getPublicUrl(bucket, `${prefix}${file.name}`));

    } catch (error) {
      console.error('Storage list error:', error);
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Check if bucket exists and create if needed
   * Should be called during app initialization
   */
  async ensureBucketExists(bucket: string): Promise<void> {
    try {
      const { data: buckets, error: listError } = await this.client.storage.listBuckets();
      
      if (listError) {
        throw new Error(`Failed to list buckets: ${listError.message}`);
      }

      const bucketExists = buckets.some(b => b.name === bucket);
      
      if (!bucketExists) {
        const { error: createError } = await this.client.storage.createBucket(bucket, {
          public: true, // Make bucket public for easy access
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB limit
        });

        if (createError) {
          throw new Error(`Failed to create bucket: ${createError.message}`);
        }

        console.log(`Created storage bucket: ${bucket}`);
      }

    } catch (error) {
      console.error('Bucket setup error:', error);
      throw new Error(`Failed to setup storage bucket: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}