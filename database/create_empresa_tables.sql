-- Criar tabela empresa
CREATE TABLE IF NOT EXISTS empresa (
    id UUID NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    telefone VARCHAR(15),
    endereco VARCHAR(255),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    link_google_maps TEXT,
    formas_pagamento TEXT[],
    nome_atendente VARCHAR(100),
    genero_atendente VARCHAR(20),
    horario_funcionamento JSONB,
    descricao TEXT,
    mensagem_boas_vindas TEXT,
    numero_suporte VARCHAR(15),
    email VARCHAR(255),
    website VARCHAR(255),
    setor VARCHAR(100),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Criar tabela usuario_empresa (relacionamento muitos-para-muitos)
CREATE TABLE IF NOT EXISTS usuario_empresa (
    id UUID NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    papel VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (papel IN ('admin', 'manager', 'user')),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(usuario_id, empresa_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_empresa_nome ON empresa(nome);
CREATE INDEX IF NOT EXISTS idx_empresa_cnpj ON empresa(cnpj);
CREATE INDEX IF NOT EXISTS idx_empresa_ativo ON empresa(ativo);
CREATE INDEX IF NOT EXISTS idx_empresa_created_at ON empresa(created_at);

CREATE INDEX IF NOT EXISTS idx_usuario_empresa_usuario_id ON usuario_empresa(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_empresa_empresa_id ON usuario_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuario_empresa_papel ON usuario_empresa(papel);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_empresa_updated_at
    BEFORE UPDATE ON empresa
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usuario_empresa_updated_at
    BEFORE UPDATE ON usuario_empresa
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE empresa IS 'Tabela para armazenar informações das empresas';
COMMENT ON COLUMN empresa.nome IS 'Nome da empresa';
COMMENT ON COLUMN empresa.cnpj IS 'CNPJ da empresa (único)';
COMMENT ON COLUMN empresa.telefone IS 'Telefone principal da empresa';
COMMENT ON COLUMN empresa.endereco IS 'Endereço completo da empresa';
COMMENT ON COLUMN empresa.email IS 'Email de contato da empresa';
COMMENT ON COLUMN empresa.website IS 'Site da empresa';
COMMENT ON COLUMN empresa.setor IS 'Setor de atuação da empresa';
COMMENT ON COLUMN empresa.ativo IS 'Indica se a empresa está ativa';

COMMENT ON TABLE usuario_empresa IS 'Tabela de relacionamento entre usuários e empresas';
COMMENT ON COLUMN usuario_empresa.usuario_id IS 'Referência ao usuário';
COMMENT ON COLUMN usuario_empresa.empresa_id IS 'Referência à empresa';
COMMENT ON COLUMN usuario_empresa.papel IS 'Papel do usuário na empresa (admin, manager, user)';

-- Inserir dados de exemplo (opcional)
-- INSERT INTO empresa (nome, cnpj, telefone, endereco, email, website, setor, descricao) VALUES
-- ('Empresa Exemplo Ltda', '12.345.678/0001-90', '(11) 99999-9999', 'Rua Exemplo, 123 - São Paulo, SP', 'contato@exemplo.com', 'https://www.exemplo.com', 'Tecnologia', 'Empresa de exemplo para testes')
-- ON CONFLICT DO NOTHING;