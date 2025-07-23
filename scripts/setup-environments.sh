#!/bin/bash

# ========================================
# ATLAS - MULTI-ENVIRONMENT SETUP SCRIPT
# ========================================
# Este script configura os 3 ambientes no Vercel
# e cria os projetos Supabase necessários

set -e

echo "🏗️  Atlas Multi-Environment Setup"
echo "=================================="
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

# Verifica se o Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI não encontrado. Instale com: npm install -g vercel"
    exit 1
fi

# Verifica se o Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    print_warning "Supabase CLI não encontrado. Instale com: npm install -g supabase"
    echo "Continuando sem setup automático do Supabase..."
fi

print_step "Fazendo login no Vercel..."
vercel login

print_step "Configurando projeto Vercel..."
vercel link

# ========================================
# CONFIGURAÇÃO DOS AMBIENTES VERCEL
# ========================================

print_step "Configurando ambiente de DESENVOLVIMENTO..."
vercel env add SUPABASE_URL development
vercel env add SUPABASE_ANON_KEY development
vercel env add SUPABASE_SERVICE_ROLE_KEY development
vercel env add JWT_SECRET development
vercel env add NEXT_PUBLIC_APP_URL development

print_step "Configurando ambiente de STAGING..."
vercel env add SUPABASE_URL preview
vercel env add SUPABASE_ANON_KEY preview
vercel env add SUPABASE_SERVICE_ROLE_KEY preview
vercel env add JWT_SECRET preview
vercel env add NEXT_PUBLIC_APP_URL preview

print_step "Configurando ambiente de PRODUÇÃO..."
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add JWT_SECRET production
vercel env add NEXT_PUBLIC_APP_URL production

# ========================================
# CONFIGURAÇÃO DAS BRANCHES
# ========================================

print_step "Criando branches necessárias..."

# Verifica se estamos na branch main
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    print_warning "Você não está na branch main. Mudando para main..."
    git checkout main
fi

# Cria e push da branch develop
if ! git show-ref --verify --quiet refs/heads/develop; then
    print_step "Criando branch develop..."
    git checkout -b develop
    git push -u origin develop
    git checkout main
else
    print_success "Branch develop já existe"
fi

# Cria e push da branch staging
if ! git show-ref --verify --quiet refs/heads/staging; then
    print_step "Criando branch staging..."
    git checkout -b staging
    git push -u origin staging
    git checkout main
else
    print_success "Branch staging já existe"
fi

# ========================================
# CONFIGURAÇÃO DOS DOMÍNIOS VERCEL
# ========================================

print_step "Configurando domínios personalizados no Vercel..."
echo ""
echo "ℹ️  Configure manualmente no Vercel Dashboard:"
echo "   • Production: atlas.vercel.app (ou seu domínio personalizado)"
echo "   • Staging: atlas-staging.vercel.app"
echo "   • Development: atlas-dev.vercel.app"
echo ""

# ========================================
# PRÓXIMOS PASSOS
# ========================================

print_success "Setup inicial concluído!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "==================="
echo ""
echo "1. 🗄️  Crie 3 projetos separados no Supabase:"
echo "   • Atlas Production"
echo "   • Atlas Staging  "
echo "   • Atlas Development"
echo ""
echo "2. 🔄 Configure as variáveis de ambiente no Vercel Dashboard:"
echo "   • Copie os valores dos arquivos environments/*.env"
echo "   • Configure cada ambiente (production/preview/development)"
echo ""
echo "3. 🚀 Teste os deployments:"
echo "   • git push origin develop   # Deploy development"
echo "   • git push origin staging   # Deploy staging"
echo "   • git push origin main      # Deploy production"
echo ""
echo "4. 🧪 Configure os testes automatizados:"
echo "   • Adicione scripts de teste no package.json"
echo "   • Configure coverage reports"
echo ""
echo "5. 📊 Configure monitoramento (opcional):"
echo "   • Sentry para error tracking"
echo "   • Google Analytics"
echo "   • Uptime monitoring"
echo ""

print_success "Ambiente multi-stage configurado com sucesso! 🎉"