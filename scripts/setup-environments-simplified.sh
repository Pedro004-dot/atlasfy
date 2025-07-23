#!/bin/bash

# ========================================
# ATLAS - SIMPLIFIED ENVIRONMENT SETUP
# ========================================
# Script simplificado para configurar 2 ambientes:
# - Development (projeto dev no Supabase)
# - Production (projeto prod no Supabase)

set -e

echo "🏗️  Atlas Simplified Environment Setup"
echo "======================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de helper
print_step() {
    echo -e "${BLUE}➡️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# ========================================
# VERIFICAÇÕES INICIAIS
# ========================================

print_step "Verificando dependências..."

# Verifica se o Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI não encontrado. Instale com: npm install -g vercel"
    exit 1
fi

# Verifica se estamos no diretório correto
if [ ! -f "package.json" ]; then
    print_error "Execute este script no diretório raiz do projeto Atlas"
    exit 1
fi

print_success "Dependências verificadas"

# ========================================
# CONFIGURAÇÃO DO VERCEL
# ========================================

print_step "Configurando projeto no Vercel..."

# Login no Vercel (se necessário)
if ! vercel whoami &> /dev/null; then
    print_step "Fazendo login no Vercel..."
    vercel login
fi

# Vincula o projeto
print_step "Vinculando projeto..."
vercel link --yes

# ========================================
# CONFIGURAÇÃO DOS AMBIENTES VERCEL
# ========================================

print_step "Configurando variáveis de ambiente..."
print_warning "Você precisará inserir as variáveis de ambiente quando solicitado"
echo ""

# Configuração para DESENVOLVIMENTO (preview environment)
print_info "Configurando ambiente de DESENVOLVIMENTO (preview)..."
echo "Use os valores do arquivo environments/development.env"
echo ""

vercel env add SUPABASE_URL preview || print_warning "SUPABASE_URL já existe no preview"
vercel env add SUPABASE_ANON_KEY preview || print_warning "SUPABASE_ANON_KEY já existe no preview"
vercel env add SUPABASE_SERVICE_ROLE_KEY preview || print_warning "SUPABASE_SERVICE_ROLE_KEY já existe no preview"
vercel env add JWT_SECRET preview || print_warning "JWT_SECRET já existe no preview"
vercel env add NEXT_PUBLIC_APP_URL preview || print_warning "NEXT_PUBLIC_APP_URL já existe no preview"

echo ""
# Configuração para PRODUÇÃO
print_info "Configurando ambiente de PRODUÇÃO..."
echo "Use os valores do arquivo environments/production.env"
echo ""

vercel env add SUPABASE_URL production || print_warning "SUPABASE_URL já existe na produção"
vercel env add SUPABASE_ANON_KEY production || print_warning "SUPABASE_ANON_KEY já existe na produção"
vercel env add SUPABASE_SERVICE_ROLE_KEY production || print_warning "SUPABASE_SERVICE_ROLE_KEY já existe na produção"
vercel env add JWT_SECRET production || print_warning "JWT_SECRET já existe na produção"
vercel env add NEXT_PUBLIC_APP_URL production || print_warning "NEXT_PUBLIC_APP_URL já existe na produção"

# ========================================
# CONFIGURAÇÃO DAS BRANCHES
# ========================================

print_step "Configurando branches Git..."

# Verifica se estamos na branch main
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    print_warning "Você não está na branch main. Mudando para main..."
    git checkout main
fi

# Cria e push da branch develop (se não existir)
if ! git show-ref --verify --quiet refs/heads/develop; then
    print_step "Criando branch develop..."
    git checkout -b develop
    git push -u origin develop
    git checkout main
else
    print_success "Branch develop já existe"
fi

# ========================================
# CONFIGURAÇÃO DOS DOMÍNIOS
# ========================================

print_step "Informações sobre domínios..."
echo ""
print_info "Configure os domínios no Vercel Dashboard:"
echo "   • Production (main branch): Seu domínio personalizado"
echo "   • Development (develop branch): Gerado automaticamente pelo Vercel"
echo ""

# ========================================
# RESUMO DA CONFIGURAÇÃO
# ========================================

print_success "Setup concluído!"
echo ""
echo "🏗️  ARQUITETURA CONFIGURADA:"
echo "=========================="
echo ""
echo "📦 PRODUCTION"
echo "   • Branch: main"
echo "   • Supabase: Projeto 'prod' (bxhgjurnibfcbcxqxmsb)"
echo "   • Deploy: Automático ao push na main"
echo "   • URL: Definida no Vercel Dashboard"
echo ""
echo "🔧 DEVELOPMENT"
echo "   • Branch: develop" 
echo "   • Supabase: Projeto 'dev' (ghgeqwuderybmdlunfkb)"
echo "   • Deploy: Automático ao push na develop"
echo "   • URL: Preview URL do Vercel"
echo ""

# ========================================
# PRÓXIMOS PASSOS
# ========================================

echo "📋 PRÓXIMOS PASSOS:"
echo "==================="
echo ""
echo "1. ✅ Schema copiado para projeto dev"
echo "2. ✅ Configurações de ambiente atualizadas"
echo "3. ✅ Branches configuradas"
echo ""
echo "🚀 WORKFLOW DE DESENVOLVIMENTO:"
echo "   • Desenvolva na branch 'develop'"
echo "   • Teste no ambiente de desenvolvimento"
echo "   • Merge para 'main' quando estável"
echo ""
echo "🧪 COMANDOS ÚTEIS:"
echo "   • git checkout develop && git push"
echo "   • vercel --prod (deploy manual para produção)"
echo "   • vercel logs (ver logs de deploy)"
echo ""
echo "⚙️  CONFIGURAÇÃO ADICIONAL:"
echo "   • Configure domínio personalizado no Vercel"
echo "   • Adicione secrets sensíveis via Vercel Dashboard"
echo "   • Configure monitoramento (Sentry, Analytics)"
echo ""

print_success "Ambiente configurado com sucesso! 🎉"
print_info "Documentação completa em: docs/DEVELOPMENT_WORKFLOW.md"