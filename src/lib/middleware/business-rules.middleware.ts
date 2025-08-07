import { NextRequest } from 'next/server';
import { 
  BusinessRuleContext, 
  BusinessRuleCategory, 
  BusinessRuleResult
} from '@/lib/business-rules/interfaces/IBusinessRule';
import { getBusinessRuleEngine } from '@/lib/business-rules/engine/BusinessRuleEngine';

export interface BusinessRulesValidationResult {
  success: boolean;
  allowed: boolean;
  results: BusinessRuleResult[];
  errors: string[];
  warnings: string[];
}

export class BusinessRulesMiddleware {
  private engine = getBusinessRuleEngine();

  /**
   * Valida regras de negócio para um contexto específico
   */
  async validate(
    context: BusinessRuleContext, 
    category?: BusinessRuleCategory
  ): Promise<BusinessRulesValidationResult> {
    try {
      console.log(`[BusinessRules] Validating rules for category: ${category || 'all'}`);
      
      const results = await this.engine.executeRules(context, category);
      
      const errors = results
        .filter((r: BusinessRuleResult) => !r.success || !r.allowed)
        .map((r: BusinessRuleResult) => r.message || 'Unknown error');
      
      const warnings = results
        .filter((r: BusinessRuleResult) => r.success && r.allowed)
        .flatMap((r: BusinessRuleResult) => []);
      
      const allowed = results.every((r: BusinessRuleResult) => r.success && r.allowed);
      
      console.log(`[BusinessRules] Validation completed:`, {
        total: results.length,
        allowed,
        errors: errors.length,
        warnings: warnings.length
      });
      
      return {
        success: true,
        allowed,
        results,
        errors,
        warnings
      };
      
    } catch (error) {
      console.error('[BusinessRules] Validation error:', error);
      return {
        success: false,
        allowed: false,
        results: [],
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        warnings: []
      };
    }
  }

  /**
   * Validação específica para conexões WhatsApp
   */
  async validateConnection(context: BusinessRuleContext): Promise<BusinessRulesValidationResult> {
    return this.validate(context, BusinessRuleCategory.CONNECTION);
  }

  /**
   * Validação específica para mensagens
   */
  async validateMessage(context: BusinessRuleContext): Promise<BusinessRulesValidationResult> {
    return this.validate(context, BusinessRuleCategory.MESSAGE);
  }

  /**
   * Validação específica para webhooks
   */
  async validateWebhook(context: BusinessRuleContext): Promise<BusinessRulesValidationResult> {
    return this.validate(context, BusinessRuleCategory.WEBHOOK);
  }

  /**
   * Validação específica para autenticação
   */
  async validateAuthentication(context: BusinessRuleContext): Promise<BusinessRulesValidationResult> {
    return this.validate(context, BusinessRuleCategory.AUTHENTICATION);
  }

  /**
   * Validação de segurança
   */
  async validateSecurity(context: BusinessRuleContext): Promise<BusinessRulesValidationResult> {
    return this.validate(context, BusinessRuleCategory.SECURITY);
  }
}

// Factory para criar instância do middleware
export function createBusinessRulesMiddleware(): BusinessRulesMiddleware {
  return new BusinessRulesMiddleware();
} 