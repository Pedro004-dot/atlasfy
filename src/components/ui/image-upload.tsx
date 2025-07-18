'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateImageFile, formatFileSize } from '@/lib/utils/file-utils';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  maxSizePerImage?: number; // in MB
  acceptedFormats?: string[];
  className?: string;
  companyId?: string; // Required for upload
  productId?: string; // Required for upload
  useRealUpload?: boolean; // Toggle between Base64 and real upload
}

interface ImageError {
  file: string;
  error: string;
}

interface UploadingFile {
  name: string;
  progress: number;
}

export function ImageUpload({
  images,
  onImagesChange,
  maxImages = 5,
  maxSizePerImage = 5,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  className,
  companyId,
  productId,
  useRealUpload = false
}: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<ImageError[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Legacy Base64 conversion for development mode
  const convertToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // Real upload to Supabase Storage
  const uploadToStorage = useCallback(async (file: File): Promise<string> => {
    if (!companyId || !productId) {
      throw new Error('Company ID and Product ID are required for upload');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('companyId', companyId);
    formData.append('productId', productId);

    const token = localStorage.getItem('auth-token');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch('/api/upload/product-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Upload failed');
    }

    return result.imageUrl;
  }, [companyId, productId]);

  // Delete image from storage
  const deleteFromStorage = useCallback(async (imageUrl: string): Promise<void> => {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch('/api/upload/product-image', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageUrl })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Delete failed');
    }
  }, []);

  const processFiles = useCallback(async (files: FileList) => {
    if (images.length + files.length > maxImages) {
      setErrors([{ file: 'limite', error: `Máximo ${maxImages} imagens permitidas` }]);
      return;
    }

    setIsUploading(true);
    setErrors([]);

    const newImages: string[] = [];
    const newErrors: ImageError[] = [];
    const filesArray = Array.from(files);

    // Initialize uploading files state
    setUploadingFiles(filesArray.map(file => ({ name: file.name, progress: 0 })));

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      
      // Update progress
      setUploadingFiles(prev => 
        prev.map((item, index) => 
          index === i ? { ...item, progress: 25 } : item
        )
      );

      // Validate file using utility function
      const validationError = validateImageFile(file, maxSizePerImage * 1024 * 1024, acceptedFormats);
      
      if (validationError) {
        newErrors.push({ file: file.name, error: validationError });
        setUploadingFiles(prev => prev.filter((_, index) => index !== i));
        continue;
      }

      try {
        setUploadingFiles(prev => 
          prev.map((item, index) => 
            index === i ? { ...item, progress: 50 } : item
          )
        );

        let imageUrl: string;

        if (useRealUpload && companyId && productId) {
          // Real upload to Supabase Storage
          imageUrl = await uploadToStorage(file);
        } else {
          // Fallback to Base64 for development
          imageUrl = await convertToBase64(file);
        }

        setUploadingFiles(prev => 
          prev.map((item, index) => 
            index === i ? { ...item, progress: 100 } : item
          )
        );

        newImages.push(imageUrl);

      } catch (error) {
        newErrors.push({ 
          file: file.name, 
          error: error instanceof Error ? error.message : 'Erro ao processar imagem' 
        });
        setUploadingFiles(prev => prev.filter((_, index) => index !== i));
      }
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
    }

    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages]);
    }

    setIsUploading(false);
    setUploadingFiles([]);
  }, [images, maxImages, acceptedFormats, maxSizePerImage, useRealUpload, companyId, productId, uploadToStorage, convertToBase64, onImagesChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input value to allow same file selection
    e.target.value = '';
  }, [processFiles]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const removeImage = useCallback(async (index: number) => {
    const imageToRemove = images[index];
    
    // If using real upload and image is not Base64, delete from storage
    if (useRealUpload && imageToRemove && !imageToRemove.startsWith('data:')) {
      try {
        await deleteFromStorage(imageToRemove);
      } catch (error) {
        console.error('Failed to delete image from storage:', error);
        // Continue with local removal even if storage deletion fails
      }
    }
    
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  }, [images, onImagesChange, useRealUpload, deleteFromStorage]);

  const canAddMore = images.length < maxImages;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      {canAddMore && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
            isDragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadClick}
          style={{ borderRadius: 'var(--radius)' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(',')}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-muted flex items-center justify-center rounded-full">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {isUploading ? 'Processando...' : 'Clique ou arraste imagens aqui'}
              </p>
              <p className="text-xs text-muted-foreground">
                {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')} até {maxSizePerImage}MB cada
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Enviando imagens...</h4>
          {uploadingFiles.map((file, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate">{file.name}</span>
                <span className="text-muted-foreground">{file.progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${file.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative group aspect-square border border-border rounded-lg overflow-hidden"
              style={{ borderRadius: 'var(--radius)' }}
            >
              <img
                src={image}
                alt={`Produto ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Remove Button */}
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
              >
                <X className="h-3 w-3" />
              </Button>

              {/* Image Index */}
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>
          ))}

          {/* Add More Button */}
          {canAddMore && (
            <div
              className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              onClick={handleUploadClick}
              style={{ borderRadius: 'var(--radius)' }}
            >
              <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Adicionar</span>
            </div>
          )}
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-2 rounded"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              <AlertCircle className="h-4 w-4" />
              <span>{error.error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground">
        {images.length}/{maxImages} imagens • Formatos aceitos: {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}
      </div>
    </div>
  );
}