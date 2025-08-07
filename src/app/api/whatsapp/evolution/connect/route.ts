import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth';
import { getBusinessRuleEngine } from '@/lib/business-rules/engine/BusinessRuleEngine';
import { BusinessRuleContext, BusinessRuleCategory } from '@/lib/business-rules/interfaces/IBusinessRule';
import { createWhatsAppConnectionService } from '@/services/whatsapp-connection.service';

interface EvolutionConnectRequest {
  autoGenerate?: boolean; // New automatic generation flag
  instanceId?: string;
  instanceToken?: string;
  agentType?: string;
  empresaId?: string;
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

    const body: EvolutionConnectRequest = await request.json();
    const { autoGenerate, instanceId, instanceToken, agentType, empresaId } = body;

    // Generate unique instance name automatically
    const instanceName = autoGenerate 
      ? `atlas_${authResult.user.id.substring(0, 8)}_${empresaId || 'temp'}_${Date.now()}`
      : instanceId || `atlas_${authResult.user.id.substring(0, 8)}_${Date.now()}`;

    if (!instanceName) {
      return NextResponse.json({
        success: false,
        error: 'Instance name is required'
      }, { status: 400 });
    }

    const engine = getBusinessRuleEngine();
    const service = createWhatsAppConnectionService();

    // Step 1: Use the existing WhatsApp Connection Service
    console.log('Creating Evolution connection using service...'); 
    const result = await service.initiateEvolutionInstance(instanceName, authResult.user.id, undefined, agentType);
    
    if (!result.success) {
      console.error('Evolution service error:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to create Evolution instance',
        message: result.message,
        errorCode: 'EVOLUTION_SERVICE_ERROR'
      }, { status: 500 });
    }

    console.log('Evolution service result:', result.success ? 'SUCCESS' : 'FAILED');

    // Step 2: Business rules validation (optional, service already handles basic validation)
    const context: BusinessRuleContext = {
      user_id: authResult.user.id,
      empresa_id: empresaId,
      metadata: {
        connection_type: 'evolution',
        instance_id: instanceName,
        agent_type: agentType,
        phone_number: result.data?.phone_number,
        profile_name: result.data?.evolution_instance_data?.profileName
      }
    };

    // Execute business rules
    const rulesResults = await engine.executeRules(context, BusinessRuleCategory.CONNECTION);
    const violations = rulesResults.filter(result => !result.allowed);

    if (violations.length > 0) {
      // If business rules fail, clean up the created connection
      try {
        await service.deleteConnection(instanceName);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
      
      return NextResponse.json({
        success: false,
        error: 'Business rules validation failed',
        errorCode: 'CONNECTION_BUSINESS_RULES_VIOLATION',
        details: violations.map(v => v.message),
        data: { violations }
      }, { status: 400 });
    }

    // Step 3: Return successful connection (service already saved to database)
    return NextResponse.json({
      success: true,
      message: 'Evolution API connection created successfully',
      data: {
        connection: {
          id: result.data?.id,
          instanceName: result.data?.instance_name,
          instanceId: result.data?.evolution_instance_data?.instanceName,
          status: result.data?.status,
          phoneNumber: result.data?.phone_number,
          profileName: result.data?.evolution_instance_data?.profileName
        },
        qrCode: result.data?.qr_code,
        phoneNumber: result.data?.phone_number,
        profileName: result.data?.evolution_instance_data?.profileName
      }
    });

  } catch (error) {
    console.error('Evolution connect error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during Evolution API connection',
      errorCode: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// Get connection status
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Token inválido' }, 
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instanceId') || searchParams.get('instanceName');

    if (!instanceName) {
      return NextResponse.json({
        success: false,
        error: 'Instance name is required'
      }, { status: 400 });
    }

    const service = createWhatsAppConnectionService();
    const result = await service.getConnectionStatus(instanceName);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Connection not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Get evolution connection error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get connection status'
    }, { status: 500 });
  }
}