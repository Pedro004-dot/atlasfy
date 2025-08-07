import { initializeBusinessRuleEngine } from './engine/BusinessRuleEngine';

/**
 * Inicializa o sistema de regras de negócio
 * Deve ser chamado na inicialização da aplicação
 */
export async function initializeBusinessRules(): Promise<void> {
  try {
    console.log('[BusinessRules] Initializing business rules engine...');
    
    const engine = await initializeBusinessRuleEngine();
    
    console.log('[BusinessRules] Engine initialized successfully');
    console.log(`[BusinessRules] Total rules registered: ${engine.getAllRules().length}`);
    
    // Log das regras por categoria
    const rulesByCategory = engine.getAllRules().reduce((acc, rule) => {
      if (!acc[rule.category]) {
        acc[rule.category] = [];
      }
      acc[rule.category].push(rule.name);
      return acc;
    }, {} as Record<string, string[]>);
    
    console.log('[BusinessRules] Rules by category:', rulesByCategory);
    
  } catch (error) {
    console.error('[BusinessRules] Failed to initialize business rules engine:', error);
    throw error;
  }
}

/**
 * Verifica se o sistema de regras está inicializado
 */
export function isBusinessRulesInitialized(): boolean {
  try {
    const { getBusinessRuleEngine } = require('./engine/BusinessRuleEngine');
    const engine = getBusinessRuleEngine();
    return engine.getAllRules().length > 0;
  } catch {
    return false;
  }
} 