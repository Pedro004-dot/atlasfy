/**
 * TypeScript types for WhatsApp Official Meta Cloud API integration
 */

// Base connection status types
export type ConnectionStatus = 'pending' | 'active' | 'suspended' | 'error' | 'expired' | 'rate_limited';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export type VerifiedStatus = 'verified' | 'unverified' | 'pending';
export type QualityRating = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';

// Main WhatsApp Official Connection interface
export interface WhatsAppOfficialConnection {
  id: string;
  user_id: string;
  empresa_id?: string;
  agent_id?: string;

  // Meta Business App Data
  business_account_id: string;
  app_id: string;
  app_secret_encrypted: string;

  // OAuth2 Tokens (encrypted)
  access_token_encrypted: string;
  refresh_token_encrypted?: string;
  system_user_token_encrypted?: string;
  token_type: string;
  token_expires_at?: string;
  token_created_at: string;

  // WhatsApp Business Account Data
  waba_id: string;
  waba_name?: string;
  phone_number_id: string;
  phone_number: string;
  display_name?: string;
  verified_status: VerifiedStatus;
  quality_rating: QualityRating;

  // Connection Status & Health
  status: ConnectionStatus;
  health_status: HealthStatus;

  // Webhook Configuration
  webhook_url?: string;
  webhook_verified: boolean;
  webhook_verify_token?: string;
  webhook_secret_encrypted?: string;

  // Rate Limiting & Quotas
  message_quota_limit: number;
  message_quota_used: number;
  quota_reset_at: string;

  // Error Handling
  last_error_message?: string;
  last_error_code?: string;
  error_count: number;
  consecutive_errors: number;
  last_error_at?: string;

  // Activity Tracking
  last_message_sent_at?: string;
  last_message_received_at?: string;
  last_webhook_received_at?: string;
  total_messages_sent: number;
  total_messages_received: number;

  // Metadata & Timestamps
  connection_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;

  // Relations (when joined)
  agente?: any;
  empresa?: any;
  usuario?: any;
}

// Data for creating new connections
export interface CreateOfficialConnectionData {
  user_id: string;
  empresa_id?: string;
  agent_id?: string;
  business_account_id: string;
  app_id: string;
  app_secret: string; // Will be encrypted before storage
  waba_id: string;
  waba_name?: string;
  phone_number_id: string;
  phone_number: string;
  display_name?: string;
  webhook_url?: string;
  webhook_verify_token?: string;
  webhook_secret?: string; // Will be encrypted before storage
}

// OAuth2 related types
export interface OAuth2Tokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number; // seconds
  expires_at: Date;
}

export interface OAuth2Result {
  success: boolean;
  tokens?: OAuth2Tokens;
  user_info?: MetaUserInfo;
  business_accounts?: WhatsAppBusinessAccount[];
  error?: string;
  error_code?: string;
}

export interface TokenRefreshResult {
  success: boolean;
  tokens?: OAuth2Tokens;
  error?: string;
  error_code?: string;
}

// Meta API response types
export interface MetaUserInfo {
  id: string;
  name: string;
  email?: string;
}

export interface WhatsAppBusinessAccount {
  id: string;
  name: string;
  verified_status: VerifiedStatus;
  phone_numbers: WhatsAppPhoneNumber[];
}

export interface WhatsAppPhoneNumber {
  id: string; // This is the phone_number_id for API calls
  phone_number: string;
  display_phone_number: string;
  verified_name: string;
  status: string;
  quality_rating: QualityRating;
}

// Event logging types
export type EventType = 
  | 'connection_created' | 'connection_updated' | 'connection_deleted'
  | 'oauth_started' | 'oauth_completed' | 'oauth_failed'
  | 'token_refreshed' | 'token_expired'
  | 'message_sent' | 'message_received' | 'message_failed'
  | 'webhook_received' | 'webhook_failed' | 'webhook_verified'
  | 'rate_limit_hit' | 'quota_exceeded'
  | 'error_occurred' | 'health_check';

export type EventStatus = 'success' | 'error' | 'warning' | 'info';

export interface WhatsAppOfficialLog {
  id: string;
  connection_id: string;
  event_type: EventType;
  event_status: EventStatus;
  event_data: Record<string, any>;
  meta_response_data: Record<string, any>;
  error_code?: string;
  error_message?: string;
  error_details: Record<string, any>;
  request_id?: string;
  user_agent?: string;
  ip_address?: string;
  duration_ms?: number;
  created_at: string;
  metadata: Record<string, any>;
}

// Service layer types
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  error_code?: string;
  message?: string;
}

export interface CreateConnectionRequest {
  instanceName: string;
  empresaId?: string;
  agentId?: string;
  webhookUrl?: string;
}

export interface MessageData {
  to: string;
  type: 'text' | 'image' | 'document' | 'template';
  text?: {
    body: string;
  };
  image?: {
    link: string;
    caption?: string;
  };
  document?: {
    link: string;
    filename: string;
    caption?: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: any[];
  };
}

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: {
    messaging_product: string;
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: WebhookContact[];
    messages?: WebhookMessage[];
    statuses?: WebhookStatus[];
    errors?: WebhookError[];
  };
  field: string;
}

export interface WebhookContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  video?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  audio?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  document?: {
    id: string;
    filename: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  sticker?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  context?: {
    from: string;
    id: string;
  };
}

export interface WebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: WebhookError[];
}

export interface WebhookError {
  code: number;
  title: string;
  message: string;
  error_data?: {
    details: string;
  };
}

// Meta API error types
export interface MetaAPIError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  used: number;
  remaining: number;
  reset_at: Date;
}

// Health check types
export interface HealthCheckResult {
  connection_id: string;
  status: HealthStatus;
  checks: {
    token_valid: boolean;
    webhook_reachable: boolean;
    phone_number_active: boolean;
    rate_limit_ok: boolean;
  };
  last_checked: Date;
  issues: string[];
}

// Connection statistics
export interface ConnectionStats {
  connection_id: string;
  period_start: Date;
  period_end: Date;
  messages_sent: number;
  messages_received: number;
  messages_failed: number;
  webhook_events: number;
  errors: number;
  uptime_percentage: number;
}