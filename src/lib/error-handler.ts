import { z } from 'zod';
import { ApiResponse } from '@/types';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso não encontrado') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Não autorizado') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acesso negado') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export function handleError(error: unknown): ApiResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      message: error.message,
      error: error.code || 'APP_ERROR'
    };
  }

  if (error instanceof z.ZodError) {
    return {
      success: false,
      message: 'Dados inválidos',
      error: 'VALIDATION_ERROR',
      data: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    };
  }

  if (error instanceof Error) {
    // Log unexpected errors
    console.error('Unexpected error:', error);
    
    return {
      success: false,
      message: 'Erro interno do servidor',
      error: 'INTERNAL_ERROR'
    };
  }

  // Handle unknown error types
  console.error('Unknown error type:', error);
  
  return {
    success: false,
    message: 'Erro interno do servidor',
    error: 'UNKNOWN_ERROR'
  };
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function createValidationError(field: string, message: string): ValidationError {
  return new ValidationError(message, field);
}

export function createNotFoundError(resource: string): NotFoundError {
  return new NotFoundError(`${resource} não encontrado`);
}

export function createUnauthorizedError(message?: string): UnauthorizedError {
  return new UnauthorizedError(message);
}

export function createForbiddenError(message?: string): ForbiddenError {
  return new ForbiddenError(message);
}