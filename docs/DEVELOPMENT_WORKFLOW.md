# 🚀 Atlas - Workflow de Desenvolvimento

## Visão Geral da Arquitetura

```
┌─────────────────┬─────────────────┬─────────────────┐
│   DEVELOPMENT   │     STAGING     │   PRODUCTION    │
├─────────────────┼─────────────────┼─────────────────┤
│ Branch: develop │ Branch: staging │ Branch: main    │
│ Auto-deploy: ❌  │ Auto-deploy: ✅  │ Auto-deploy: ✅  │
│ DB: Dev Project │ DB: Stage Proj  │ DB: Prod Proj   │
│ Tests: Unit     │ Tests: E2E      │ Tests: Smoke    │
└─────────────────┴─────────────────┴─────────────────┘
```

## 🔄 Fluxo de Desenvolvimento

### 1. **Desenvolvimento Local**
```bash
# Clone e setup inicial
git clone [repo-url]
cd atlas
npm install

# Configure ambiente local
cp environments/development.env .env.local
# Edite .env.local com suas credenciais

# Inicie desenvolvimento
npm run dev
```

### 2. **Feature Development**
```bash
# Sempre partir da develop
git checkout develop
git pull origin develop

# Criar feature branch
git checkout -b feature/nova-funcionalidade

# Desenvolver e testar localmente
npm run dev
npm run test
npm run lint

# Commit e push
git add .
git commit -m "feat: adicionar nova funcionalidade"
git push origin feature/nova-funcionalidade
```

### 3. **Code Review e Merge**
```bash
# Criar PR para develop
gh pr create --base develop --title "feat: nova funcionalidade"

# Após aprovação, merge para develop
gh pr merge --merge
```

### 4. **Deploy para Staging**
```bash
# Merge develop -> staging para testes
git checkout staging
git pull origin staging
git merge develop
git push origin staging

# ✅ Auto-deploy para https://atlas-staging.vercel.app
```

### 5. **Deploy para Produção**
```bash
# Após testes em staging, merge para main
git checkout main
git pull origin main
git merge staging
git push origin main

# ✅ Auto-deploy para https://atlas.vercel.app
```

## 🧪 Estratégia de Testes por Ambiente

### Development
- **Testes Unitários**: Jest + React Testing Library
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode

### Staging
- **Testes de Integração**: API testing
- **Testes E2E**: Playwright/Cypress
- **Performance Testing**: Lighthouse CI
- **Security Scanning**: npm audit

### Production
- **Smoke Tests**: Verificações básicas pós-deploy
- **Monitoring**: Error tracking + uptime
- **Analytics**: User behavior tracking

## 🚨 Hotfixes

Para correções urgentes em produção:

```bash
# Criar hotfix direto da main
git checkout main
git checkout -b hotfix/critical-fix

# Desenvolver e testar
npm run test
npm run build

# Deploy direto para produção
git checkout main
git merge hotfix/critical-fix
git push origin main

# Sync com outras branches
git checkout staging
git merge main
git push origin staging

git checkout develop
git merge main  
git push origin develop
```

## 📊 Monitoramento por Ambiente

### Development
- **Logs**: Console local
- **Debug**: VS Code debugging
- **Database**: Supabase dashboard local

### Staging
- **Logs**: Vercel function logs
- **Error Tracking**: Sentry (desenvolvimento)
- **Performance**: Vercel analytics
- **Database**: Supabase staging project

### Production
- **Error Tracking**: Sentry (produção)
- **Uptime Monitoring**: UptimeRobot/Pingdom
- **Analytics**: Google Analytics
- **Performance**: Vercel Pro analytics
- **Database**: Supabase production project

## 🔒 Segurança por Ambiente

### Development
- Dados fictícios/anonimizados
- API keys de sandbox
- Debug mode habilitado

### Staging
- Dados de teste realistas
- API keys de staging
- SSL obrigatório
- Rate limiting básico

### Production
- Dados reais
- API keys de produção
- SSL/HTTPS obrigatório
- Rate limiting avançado
- WAF (Web Application Firewall)

## 📝 Checklist de Deploy

### Antes do Deploy
- [ ] Tests passando
- [ ] Build funcionando
- [ ] Linting OK
- [ ] Type checking OK
- [ ] Environment variables configuradas
- [ ] Database migrations aplicadas
- [ ] Documentação atualizada

### Após o Deploy
- [ ] Smoke tests passando
- [ ] Logs sem erros críticos
- [ ] Performance dentro dos limites
- [ ] Funcionalidades principais OK
- [ ] Rollback plan definido

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Servidor local
npm run test             # Testes unitários
npm run test:watch       # Testes em watch mode
npm run lint             # ESLint
npm run type-check       # TypeScript check

# Build e Deploy
npm run build            # Build de produção
npm run start            # Servidor produção local
vercel dev               # Servidor local com Vercel
vercel --prod            # Deploy produção manual

# Database
supabase start           # Supabase local
supabase db reset        # Reset database local
supabase gen types       # Gerar tipos TypeScript

# Manutenção
npm audit                # Vulnerabilidades
npm update               # Atualizar dependências
npx next-unused          # Código não usado
```

## 🎯 Boas Práticas

### Commits
- Use conventional commits: `feat:`, `fix:`, `docs:`, etc.
- Commits pequenos e focados
- Mensagens descritivas em português

### Branches
- `main` → Produção (sempre estável)
- `staging` → Testes finais
- `develop` → Desenvolvimento ativo
- `feature/*` → Novas funcionalidades
- `hotfix/*` → Correções urgentes

### Code Review
- PRs pequenos e focados
- Testes obrigatórios
- Documentação atualizada
- Performance considerada
- Segurança validada

### Monitoramento
- Logs estruturados
- Métricas de performance
- Alertas automatizados
- Dashboards acessíveis

## 🆘 Troubleshooting

### Deploy Falha
1. Verificar logs no Vercel Dashboard
2. Validar environment variables
3. Confirmar database connection
4. Testar build local

### Performance Issues
1. Verificar bundle size
2. Analisar Core Web Vitals
3. Otimizar imagens e assets
4. Review database queries

### Database Issues
1. Verificar connection strings
2. Confirmar permissões
3. Validar migrations
4. Backup antes de mudanças

---

**💡 Dica**: Mantenha este workflow simples no início. Adicione complexidade conforme a equipe cresce e os requisitos aumentam.