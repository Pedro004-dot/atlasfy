import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { z } from 'zod';

/**
 * Middleware abstrato para validação (Open/Closed principle)
 * Novas validações podem ser adicionadas sem modificar o código existente
 */
export abstract class BaseValidationMiddleware {
  abstract validate(request: NextRequest): Promise<ValidationResult>;
}

export interface ValidationResult {
  success: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
  statusCode?: number;
}

/**
 * Middleware de autenticação JWT
 */
export class JWTAuthMiddleware extends BaseValidationMiddleware {
  async validate(request: NextRequest): Promise<ValidationResult> {
    try {
      const authorization = request.headers.get('authorization');
      
      if (!authorization?.startsWith('Bearer ')) {
        return {
          success: false,
          error: 'Token não fornecido',
          errorCode: 'MISSING_TOKEN',
          statusCode: 401
        };
      }

      const token = authorization.split(' ')[1];
      const { userId } = await verifyJWT(token);

      return {
        success: true,
        data: { userId, token }
      };

    } catch (error) {
      return {
        success: false,
        error: 'Token inválido',
        errorCode: 'INVALID_TOKEN',
        statusCode: 401
      };
    }
  }
}

/**
 * Middleware de validação de OAuth2 state
 */
export class OAuth2StateMiddleware extends BaseValidationMiddleware {
  private readonly stateSchema = z.object({
    code: z.string().min(1, 'Authorization code is required'),
    state: z.string().min(1, 'State parameter is required')
  });

  async validate(request: NextRequest): Promise<ValidationResult> {
    try {
      const { searchParams } = new URL(request.url);
      
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      
      // Check for OAuth2 errors first
      if (error) {
        const errorDescription = searchParams.get('error_description') || '';
        return {
          success: false,
          error: `OAuth2 error: ${error} - ${errorDescription}`,
          errorCode: 'OAUTH2_ERROR',
          statusCode: 400
        };
      }

      const validationResult = this.stateSchema.safeParse({ code, state });
      
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors
          .map(e => `${e.path.join('.')}: ${e.message}`)
          .join(', ');

        return {
          success: false,
          error: errorMessage,
          errorCode: 'VALIDATION_ERROR',
          statusCode: 400
        };
      }

      return {
        success: true,
        data: validationResult.data
      };

    } catch (error) {
      return {
        success: false,
        error: 'Invalid OAuth2 callback parameters',
        errorCode: 'CALLBACK_VALIDATION_ERROR',
        statusCode: 400
      };
    }
  }
}

/**
 * Middleware de validação de webhook Meta
 */
export class WebhookValidationMiddleware extends BaseValidationMiddleware {
  private readonly verifyTokenSchema = z.object({
    'hub.mode': z.literal('subscribe'),
    'hub.challenge': z.string().min(1),
    'hub.verify_token': z.string().min(1)
  });

  async validate(request: NextRequest): Promise<ValidationResult> {
    try {
      const method = request.method;
      
      // GET request for webhook verification
      if (method === 'GET') {
        const { searchParams } = new URL(request.url);
        
        const hubMode = searchParams.get('hub.mode');
        const hubChallenge = searchParams.get('hub.challenge');
        const hubVerifyToken = searchParams.get('hub.verify_token');
        
        const validationResult = this.verifyTokenSchema.safeParse({
          'hub.mode': hubMode,
          'hub.challenge': hubChallenge,
          'hub.verify_token': hubVerifyToken
        });

        if (!validationResult.success) {
          return {
            success: false,
            error: 'Invalid webhook verification parameters',
            errorCode: 'WEBHOOK_VERIFICATION_ERROR',
            statusCode: 400
          };
        }

        return {
          success: true,
          data: {
            mode: hubMode,
            challenge: hubChallenge,
            verifyToken: hubVerifyToken
          }
        };
      }

      // POST request for webhook events
      if (method === 'POST') {
        const signature = request.headers.get('x-hub-signature-256');
        
        if (!signature) {
          return {
            success: false,
            error: 'Missing webhook signature',
            errorCode: 'MISSING_SIGNATURE',
            statusCode: 400
          };
        }

        return {
          success: true,
          data: { signature }
        };
      }

      return {
        success: false,
        error: 'Method not allowed',
        errorCode: 'METHOD_NOT_ALLOWED',
        statusCode: 405
      };

    } catch (error) {
      return {
        success: false,
        error: 'Webhook validation failed',
        errorCode: 'WEBHOOK_VALIDATION_ERROR',
        statusCode: 500
      };
    }
  }
}

/**
 * Middleware de validação de conexão
 */
export class ConnectionValidationMiddleware extends BaseValidationMiddleware {
  private readonly createConnectionSchema = z.object({
    instanceName: z.string().min(3, 'Instance name must be at least 3 characters'),
    empresaId: z.string().uuid().optional(),
    agentId: z.string().uuid().optional(),
    webhookUrl: z.string().url().optional(),
    businessAccountId: z.string().min(1, 'Business account ID is required'),
    phoneNumberId: z.string().min(1, 'Phone number ID is required'),
    phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format')
  });

  async validate(request: NextRequest): Promise<ValidationResult> {
    try {
      const body = await request.json();
      
      const validationResult = this.createConnectionSchema.safeParse(body);
      
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors
          .map(e => `${e.path.join('.')}: ${e.message}`)
          .join(', ');

        return {
          success: false,
          error: errorMessage,
          errorCode: 'VALIDATION_ERROR',
          statusCode: 400
        };
      }

      return {
        success: true,
        data: validationResult.data
      };

    } catch (error) {
      return {
        success: false,
        error: 'Invalid request body',
        errorCode: 'INVALID_BODY',
        statusCode: 400
      };
    }
  }
}

/**
 * Compositor de middlewares - permite combinar múltiplas validações
 */
export class MiddlewareComposer {
  constructor(private middlewares: BaseValidationMiddleware[]) {}

  async validate(request: NextRequest): Promise<ValidationResult> {
    const results: any = {};
    
    for (const middleware of this.middlewares) {
      const result = await middleware.validate(request);
      
      if (!result.success) {
        return result; // Falha rápida no primeiro erro
      }
      
      // Combina os dados de todas as validações
      Object.assign(results, result.data || {});
    }

    return {
      success: true,
      data: results
    };
  }

  // Permite adicionar novos middlewares sem modificar o código existente
  addMiddleware(middleware: BaseValidationMiddleware): MiddlewareComposer {
    return new MiddlewareComposer([...this.middlewares, middleware]);
  }
}

/**
 * Factory para criar middlewares compostos
 */
export class MiddlewareFactory {
  static createAuthMiddleware(): MiddlewareComposer {
    return new MiddlewareComposer([
      new JWTAuthMiddleware()
    ]);
  }

  static createOAuth2CallbackMiddleware(): MiddlewareComposer {
    return new MiddlewareComposer([
      new OAuth2StateMiddleware()
    ]);
  }

  static createWebhookMiddleware(): MiddlewareComposer {
    return new MiddlewareComposer([
      new WebhookValidationMiddleware()
    ]);
  }

  static createConnectionMiddleware(): MiddlewareComposer {
    return new MiddlewareComposer([
      new JWTAuthMiddleware(),
      new ConnectionValidationMiddleware()
    ]);
  }

  // Extensão futura: novos middlewares podem ser adicionados aqui
  static createCustomMiddleware(middlewares: BaseValidationMiddleware[]): MiddlewareComposer {
    return new MiddlewareComposer(middlewares);
  }
}

/**
 * Utilidade para resposta de erro padronizada
 */
export function createErrorResponse(result: ValidationResult): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: result.error,
      errorCode: result.errorCode
    },
    { status: result.statusCode || 500 }
  );
}