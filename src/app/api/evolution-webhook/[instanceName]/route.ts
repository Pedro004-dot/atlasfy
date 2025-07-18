import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppConnectionService } from '@/services/whatsapp-connection.service';
import { EvolutionWebhookEvent } from '@/types';

interface RouteParams {
  params: {
    instanceName: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { instanceName } = params;
  
  try {
    // Log incoming webhook for debugging
    const body = await request.json();
    console.log(`Webhook received for instance: ${instanceName}`, {
      event: body.event,
      timestamp: new Date().toISOString(),
      instance: body.instance
    });

    // Validate webhook payload structure
    if (!body.event || !body.instance) {
      console.warn('Invalid webhook payload:', body);
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    // Verify instance name matches the URL parameter
    if (body.instance !== instanceName) {
      console.warn(`Instance mismatch: URL=${instanceName}, Payload=${body.instance}`);
      return NextResponse.json(
        { error: 'Instance name mismatch' },
        { status: 400 }
      );
    }

    // Optional: Verify webhook secret if Evolution API provides one
    const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret = request.headers.get('x-webhook-secret');
      if (providedSecret !== webhookSecret) {
        console.warn('Invalid webhook secret');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Process the webhook event
    const whatsappService = createWhatsAppConnectionService();
    const result = await whatsappService.processWebhookEvent(instanceName, body as EvolutionWebhookEvent);

    if (!result.success) {
      console.error('Error processing webhook:', result.error);
      
      // Still return 200 to prevent Evolution API from retrying
      // We log the error but don't fail the webhook
      return NextResponse.json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    // Return success response quickly
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error(`Error processing webhook for instance ${instanceName}:`, error);
    
    // Return 200 to prevent retries, but log the error
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Handle GET requests for webhook verification (if needed)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { instanceName } = params;
  
  // Some webhook providers require GET endpoint verification
  const challenge = request.nextUrl.searchParams.get('hub.challenge');
  
  if (challenge) {
    console.log(`Webhook verification for instance: ${instanceName}`);
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({
    message: 'Evolution API Webhook Endpoint',
    instance: instanceName,
    timestamp: new Date().toISOString()
  });
}

// Optionally handle other HTTP methods
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-webhook-secret',
    },
  });
}