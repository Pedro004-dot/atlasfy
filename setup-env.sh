#!/bin/bash

echo "🚀 Configurando variáveis de ambiente no Vercel..."

# Ler o arquivo .env e configurar cada variável
while IFS='=' read -r key value; do
    # Ignorar linhas vazias e comentários
    if [[ -n "$key" && ! "$key" =~ ^# ]]; then
        # Remover espaços em branco
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        
        echo "📝 Configurando: $key"
        
        # Configurar a variável no Vercel
        echo "$value" | npx vercel env add "$key" production
    fi
done < .env

echo "✅ Todas as variáveis de ambiente foram configuradas!"
echo "🔄 Faça um novo deploy para aplicar as mudanças: npx vercel --prod" 