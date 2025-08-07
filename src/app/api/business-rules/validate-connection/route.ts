import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth';
import { getBusinessRuleEngine } from '@/lib/business-rules/engine/BusinessRuleEngine';
import { BusinessRuleContext, BusinessRuleCategory } from '@/lib/business-rules/interfaces/IBusinessRule';

interface ValidateConnectionRequest {
  connection_type: 'evolution' | 'official';
  phone_number?: string;
  instance_name?: string;
  agent_type?: string;
  empresa_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Token inválido' }, 
        { status: 401 }
      );
    }

    const body: ValidateConnectionRequest = await request.json();
    const {
      connection_type,
      phone_number,
      instance_name,
      agent_type,
      empresa_id
    } = body;

    // Initialize business rules engine
    const engine = getBusinessRuleEngine();

    // Create validation context
    const context: BusinessRuleContext = {
      user_id: authResult.user.id,
      empresa_id: empresa_id,
      metadata: {
        connection_type,
        phone_number,
        instance_name,
        agent_type,
        validation_type: 'pre_connection'
      }
    };

    // Execute connection-related business rules
    const results = await engine.executeRules(context, BusinessRuleCategory.CONNECTION);

    // Check for any rule violations
    const violations = results.filter(result => !result.allowed);
    const hasViolations = violations.length > 0;

    if (hasViolations) {
      return NextResponse.json({
        success: false,
        error: 'Business rules validation failed',
        errorCode: 'CONNECTION_BUSINESS_RULES_VIOLATION',
        details: violations.map(v => v.message),
        data: {
          results,
          violations: violations.map(v => ({
            rule_name: v.rule_name,
            message: v.message,
            errorCode: v.errorCode,
            data: v.data
          }))
        }
      }, { status: 400 });
    }

    // All validations passed
    return NextResponse.json({
      success: true,
      message: 'All business rules validation passed',
      data: {
        results,
        validation_summary: {
          total_rules: results.length,
          passed_rules: results.filter(r => r.allowed).length,
          failed_rules: violations.length,
          connection_type,
          agent_type
        }
      }
    });

  } catch (error) {
    console.error('Business rules validation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during validation',
      errorCode: 'VALIDATION_INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Token inválido' }, 
        { status: 401 }
      );
    }

    const engine = getBusinessRuleEngine();
    const connectionRules = engine.getRulesByCategory(BusinessRuleCategory.CONNECTION);

    return NextResponse.json({
      success: true,
      data: {
        available_rules: connectionRules.map(rule => ({
          name: rule.name,
          priority: rule.priority,
          category: rule.category,
          description: `${rule.name} - Priority ${rule.priority}`
        })),
        total_rules: connectionRules.length
      }
    });

  } catch (error) {
    console.error('Error getting connection rules:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get connection rules'
    }, { status: 500 });
  }
}