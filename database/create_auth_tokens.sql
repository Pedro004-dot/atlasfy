-- Criar tabela auth_tokens para tokens de verificação de email e reset de senha
CREATE TABLE auth_tokens (
    id UUID NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    token VARCHAR(6) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('email_verification', 'password_reset')),
    expires_at TIMESTAMP NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_auth_tokens_usuario_id ON auth_tokens(usuario_id);
CREATE INDEX idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX idx_auth_tokens_tipo ON auth_tokens(tipo);
CREATE INDEX idx_auth_tokens_expires ON auth_tokens(expires_at);
CREATE INDEX idx_auth_tokens_usado ON auth_tokens(usado);

-- Índice composto para busca de tokens válidos
CREATE INDEX idx_auth_tokens_valid ON auth_tokens(token, tipo, usado, expires_at);

-- Função para limpar tokens expirados automaticamente
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM auth_tokens 
    WHERE expires_at < NOW() OR usado = true;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE auth_tokens IS 'Tabela para armazenar tokens de autenticação (verificação de email e reset de senha)';
COMMENT ON COLUMN auth_tokens.usuario_id IS 'Referência ao usuário dono do token';
COMMENT ON COLUMN auth_tokens.token IS 'Token de 6 dígitos numéricos';
COMMENT ON COLUMN auth_tokens.tipo IS 'Tipo do token: email_verification ou password_reset';
COMMENT ON COLUMN auth_tokens.expires_at IS 'Data e hora de expiração do token (15 minutos)';
COMMENT ON COLUMN auth_tokens.usado IS 'Indica se o token já foi utilizado';