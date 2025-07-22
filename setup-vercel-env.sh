#!/bin/bash

# Script para configurar variáveis de ambiente no Vercel
echo "🚀 Configurando variáveis de ambiente no Vercel..."

# Verificar se o projeto está linkado ao Vercel
if ! npx vercel project ls > /dev/null 2>&1; then
    echo "❌ Projeto não está linkado ao Vercel. Execute 'npx vercel link' primeiro."
    exit 1
fi

# Configurar variáveis de ambiente
echo "📝 Configurando variáveis de ambiente..."

# Supabase Configuration
npx vercel env add SUPABASE_URL production
npx vercel env add SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production

# JWT Configuration
npx vercel env add JWT_SECRET production

# Email Configuration
npx vercel env add SMTP_HOST production
npx vercel env add SMTP_PORT production
npx vercel env add SMTP_USER production
npx vercel env add SMTP_PASS production
npx vercel env add FROM_EMAIL production
npx vercel env add FROM_NAME production

# App Configuration
npx vercel env add NEXT_PUBLIC_APP_URL production

# Evolution API Configuration
npx vercel env add EVOLUTION_API_URL production
npx vercel env add EVOLUTION_API_KEY production

# Asaas Configuration
npx vercel env add ASAAS_API_KEY production
npx vercel env add DEFAULT_BANKING_PROVIDER production

echo "✅ Variáveis de ambiente configuradas com sucesso!"
echo "🔄 Faça um novo deploy para aplicar as mudanças: npx vercel --prod" 