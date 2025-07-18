/**
 * Product Image Upload API Endpoint
 * 
 * POST /api/upload/product-image
 * Handles product image uploads to Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFileUploadService } from '@/services/file-upload.service';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

async function validateToken(request: NextRequest): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Token não fornecido' };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    return { success: true, userId: decoded.userId };
  } catch (error) {
    return { success: false, error: 'Token inválido' };
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== UPLOAD API START ===');
    
    // 1. Authenticate user
    const authResult = await validateToken(request);
    if (!authResult.success) {
      console.log('Auth failed:', authResult.error);
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId!;
    console.log('User authenticated:', userId);

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const companyId = formData.get('companyId') as string;
    const productId = formData.get('productId') as string;

    console.log('Form data:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      companyId,
      productId
    });

    // 3. Validate required fields
    if (!file) {
      console.log('No file provided');
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!companyId) {
      console.log('No company ID provided');
      return NextResponse.json(
        { success: false, error: 'Company ID is required' },
        { status: 400 }
      );
    }

    if (!productId) {
      console.log('No product ID provided');
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // 4. Upload file using service
    console.log('Creating file upload service...');
    const fileUploadService = createFileUploadService();
    
    console.log('Uploading file...');
    const imageUrl = await fileUploadService.uploadProductImage(
      file,
      userId,
      companyId,
      productId
    );

    console.log('Upload successful:', imageUrl);

    // 5. Return success response
    return NextResponse.json({
      success: true,
      imageUrl,
      message: 'Image uploaded successfully'
    });

  } catch (error: any) {
    console.error('Upload API error:', error);
    
    // Log detailed error info
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to upload image' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await validateToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // 3. Delete file using service
    const fileUploadService = createFileUploadService();
    await fileUploadService.deleteProductImage(imageUrl);

    // 4. Return success response
    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete image' 
      },
      { status: 500 }
    );
  }
}