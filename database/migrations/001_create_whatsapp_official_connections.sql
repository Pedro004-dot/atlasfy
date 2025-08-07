-- Migration: Create WhatsApp Official Connections tables
-- Created: 2025-01-XX
-- Description: Creates tables for Meta WhatsApp Cloud API integration

-- Create the main whatsapp_official_connections table
CREATE TABLE whatsapp_official_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresa(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agente(id) ON DELETE SET NULL,
  
  -- Meta Business App Data
  business_account_id VARCHAR(255) NOT NULL,
  app_id VARCHAR(255) NOT NULL,
  app_secret_encrypted TEXT NOT NULL, -- AES-256-GCM encrypted
  
  -- OAuth2 Tokens (all encrypted)
  access_token_encrypted TEXT NOT NULL, -- User access token (60 days)
  refresh_token_encrypted TEXT, -- For token refresh
  system_user_token_encrypted TEXT, -- Permanent system user token
  token_type VARCHAR(20) DEFAULT 'Bearer',
  token_expires_at TIMESTAMP WITH TIME ZONE,
  token_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- WhatsApp Business Account Data  
  waba_id VARCHAR(255) NOT NULL, -- WhatsApp Business Account ID
  waba_name VARCHAR(255), -- Business account name
  phone_number_id VARCHAR(255) NOT NULL, -- Meta Phone Number ID
  phone_number VARCHAR(20) NOT NULL, -- WhatsApp phone number (+5511999999999)
  display_name VARCHAR(255), -- Business display name
  verified_status VARCHAR(50) DEFAULT 'unverified', -- verified, unverified, pending
  quality_rating VARCHAR(50) DEFAULT 'unknown', -- GREEN, YELLOW, RED, UNKNOWN
  
  -- Connection Status & Health
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'error', 'expired', 'rate_limited')),
  health_status VARCHAR(50) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  
  -- Webhook Configuration
  webhook_url TEXT,
  webhook_verified BOOLEAN DEFAULT false,
  webhook_verify_token VARCHAR(255),
  webhook_secret_encrypted TEXT, -- For signature validation
  
  -- Rate Limiting & Quotas
  message_quota_limit INTEGER DEFAULT 1000, -- Daily message limit
  message_quota_used INTEGER DEFAULT 0, -- Messages sent today
  quota_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day'),
  
  -- Error Handling
  last_error_message TEXT,
  last_error_code VARCHAR(50),
  error_count INTEGER DEFAULT 0,
  consecutive_errors INTEGER DEFAULT 0,
  last_error_at TIMESTAMP WITH TIME ZONE,
  
  -- Activity Tracking
  last_message_sent_at TIMESTAMP WITH TIME ZONE,
  last_message_received_at TIMESTAMP WITH TIME ZONE,
  last_webhook_received_at TIMESTAMP WITH TIME ZONE,
  total_messages_sent INTEGER DEFAULT 0,
  total_messages_received INTEGER DEFAULT 0,
  
  -- Metadata & Timestamps
  connection_metadata JSONB DEFAULT '{}', -- Store additional Meta API data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(phone_number_id), -- One connection per Meta phone number ID
  UNIQUE(user_id, phone_number), -- One phone number per user
  UNIQUE(waba_id, phone_number_id) -- Ensure consistency
);

-- Create the whatsapp_official_logs table for audit trail
CREATE TABLE whatsapp_official_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES whatsapp_official_connections(id) ON DELETE CASCADE,
  
  -- Event Information
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'connection_created', 'connection_updated', 'connection_deleted',
    'oauth_started', 'oauth_completed', 'oauth_failed',
    'token_refreshed', 'token_expired',
    'message_sent', 'message_received', 'message_failed',
    'webhook_received', 'webhook_failed', 'webhook_verified',
    'rate_limit_hit', 'quota_exceeded',
    'error_occurred', 'health_check'
  )),
  event_status VARCHAR(20) NOT NULL CHECK (event_status IN ('success', 'error', 'warning', 'info')),
  
  -- Event Data
  event_data JSONB DEFAULT '{}', -- Store event-specific data
  meta_response_data JSONB DEFAULT '{}', -- Store Meta API response
  
  -- Error Information
  error_code VARCHAR(100),
  error_message TEXT,
  error_details JSONB DEFAULT '{}',
  
  -- Request Information
  request_id VARCHAR(255), -- For tracing requests
  user_agent TEXT,
  ip_address INET,
  
  -- Timing
  duration_ms INTEGER, -- How long the operation took
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX idx_whatsapp_official_user_id ON whatsapp_official_connections(user_id);
CREATE INDEX idx_whatsapp_official_agent_id ON whatsapp_official_connections(agent_id);
CREATE INDEX idx_whatsapp_official_empresa_id ON whatsapp_official_connections(empresa_id);
CREATE INDEX idx_whatsapp_official_phone ON whatsapp_official_connections(phone_number);
CREATE INDEX idx_whatsapp_official_phone_id ON whatsapp_official_connections(phone_number_id);
CREATE INDEX idx_whatsapp_official_waba_id ON whatsapp_official_connections(waba_id);
CREATE INDEX idx_whatsapp_official_status ON whatsapp_official_connections(status);
CREATE INDEX idx_whatsapp_official_health ON whatsapp_official_connections(health_status);
CREATE INDEX idx_whatsapp_official_created ON whatsapp_official_connections(created_at);
CREATE INDEX idx_whatsapp_official_updated ON whatsapp_official_connections(updated_at);
CREATE INDEX idx_whatsapp_official_expires ON whatsapp_official_connections(token_expires_at);

-- Indexes for logs table
CREATE INDEX idx_whatsapp_official_logs_connection ON whatsapp_official_logs(connection_id);
CREATE INDEX idx_whatsapp_official_logs_type ON whatsapp_official_logs(event_type);
CREATE INDEX idx_whatsapp_official_logs_status ON whatsapp_official_logs(event_status);
CREATE INDEX idx_whatsapp_official_logs_created ON whatsapp_official_logs(created_at DESC);
CREATE INDEX idx_whatsapp_official_logs_request ON whatsapp_official_logs(request_id) WHERE request_id IS NOT NULL;

-- Create partial indexes for common queries
CREATE INDEX idx_whatsapp_official_active ON whatsapp_official_connections(user_id, status) WHERE status = 'active';
CREATE INDEX idx_whatsapp_official_errors ON whatsapp_official_connections(consecutive_errors, last_error_at) WHERE consecutive_errors > 0;
CREATE INDEX idx_whatsapp_official_quota ON whatsapp_official_connections(message_quota_used, quota_reset_at) WHERE message_quota_used > 0;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_official_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER tr_whatsapp_official_updated_at
  BEFORE UPDATE ON whatsapp_official_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_official_updated_at();

-- Create function to reset daily quota
CREATE OR REPLACE FUNCTION reset_whatsapp_daily_quota()
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_official_connections
  SET 
    message_quota_used = 0,
    quota_reset_at = NOW() + INTERVAL '1 day'
  WHERE quota_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to log whatsapp events
CREATE OR REPLACE FUNCTION log_whatsapp_official_event(
  p_connection_id UUID,
  p_event_type VARCHAR(50),
  p_event_status VARCHAR(20),
  p_event_data JSONB DEFAULT '{}',
  p_error_code VARCHAR(100) DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_request_id VARCHAR(255) DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO whatsapp_official_logs (
    connection_id,
    event_type,
    event_status,
    event_data,
    error_code,
    error_message,
    request_id,
    duration_ms
  ) VALUES (
    p_connection_id,
    p_event_type,
    p_event_status,
    p_event_data,
    p_error_code,
    p_error_message,
    p_request_id,
    p_duration_ms
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE whatsapp_official_connections IS 'Stores Meta WhatsApp Cloud API connections with encrypted tokens';
COMMENT ON TABLE whatsapp_official_logs IS 'Audit trail for all WhatsApp official API events';
COMMENT ON COLUMN whatsapp_official_connections.access_token_encrypted IS 'AES-256-GCM encrypted user access token (60-day expiry)';
COMMENT ON COLUMN whatsapp_official_connections.system_user_token_encrypted IS 'AES-256-GCM encrypted permanent system user token';
COMMENT ON COLUMN whatsapp_official_connections.app_secret_encrypted IS 'AES-256-GCM encrypted Meta app secret';
COMMENT ON COLUMN whatsapp_official_connections.webhook_secret_encrypted IS 'AES-256-GCM encrypted webhook signature validation secret';
COMMENT ON COLUMN whatsapp_official_connections.phone_number_id IS 'Meta-assigned Phone Number ID for API calls';
COMMENT ON COLUMN whatsapp_official_connections.waba_id IS 'WhatsApp Business Account ID from Meta';

-- Grant permissions (adjust based on your role structure)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_official_connections TO your_app_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_official_logs TO your_app_role;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_role;