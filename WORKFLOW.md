# 🚀 Atlas - Workflow de Desenvolvimento

## 📊 Estrutura de Branches

### **Repositório Principal (atlas-production)**
```
main     → 🟢 Código estável em produção
beta     → 🟡 Features testadas prontas para release
```

### **Fluxo de Desenvolvimento**
```
feature → beta → main
   ↓       ↓      ↓
  Dev → Testing → Production
```

---

## 🏗️ Branches e Responsabilidades

### **Branch `main`**
- **Propósito**: Versão estável em produção
- **Estado atual**: Evolution API funcionando perfeitamente
- **Proteção**: Apenas merge via Pull Request
- **Deploy**: Automático para produção

### **Branch `beta`**
- **Propósito**: Features testadas e aprovadas
- **Estado atual**: WhatsApp Official API implementada
- **Testes**: Features completamente testadas
- **Review**: Aprovação obrigatória antes do merge para main

### **Branch `feature`**
- **Propósito**: Desenvolvimento de novas funcionalidades
- **Base**: Criada sempre a partir de `beta`
- **Ciclo**: Feature → Beta → Main
- **Liberdade**: Experimentação e desenvolvimento ágil

---

## 🔄 Workflow de Desenvolvimento

### **1. Nova Feature**
```bash
# Partir do beta (sempre atualizado)
git checkout beta
git pull origin beta

# Criar branch de feature
git checkout -b feature/nova-funcionalidade

# Desenvolver...
# Commits...

# Push para feature
git push origin feature/nova-funcionalidade
```

### **2. Testing e Validação**
```bash
# Merge para beta após desenvolvimento
git checkout beta
git pull origin beta
git merge feature/nova-funcionalidade

# Testes completos em beta
# Validação de business rules
# QA e aprovação

git push origin beta
```

### **3. Release para Produção**
```bash
# Merge para main após aprovação
git checkout main
git pull origin main
git merge beta

# Tag da versão
git tag -a v1.x.x -m "Release v1.x.x"

git push origin main --tags
```

---

## 🎯 Casos de Uso

### **Desenvolvimento Normal**
```
feature (nova funcionalidade) 
    ↓ 
beta (testing e validação)
    ↓
main (produção estável)
```

### **Hotfix Urgente**
```
main (problema em produção)
    ↓
hotfix/fix-critical-bug
    ↓
main + beta (aplicar em ambos)
```

### **Feature Experimental**
```
feature (experimentação livre)
    ↓
beta (quando estável)
    ↓
main (quando aprovado)
```

---

## 📋 Regras de Negócio

### **Proteções de Branch**

#### **Main**
- ✅ Pull Request obrigatório
- ✅ Review obrigatório
- ✅ CI/CD deve passar
- ✅ Apenas merge de `beta` ou `hotfix`

#### **Beta** 
- ✅ Pull Request recomendado
- ✅ Testes automatizados
- ✅ Validação de business rules
- ✅ QA approval

#### **Feature**
- 🔄 Desenvolvimento livre
- 🔄 Commits frequentes
- 🔄 Experimentação permitida

### **Naming Convention**
```
feature/whatsapp-official-api
feature/new-dashboard-metrics
feature/ai-agent-improvements
hotfix/critical-production-bug
hotfix/security-vulnerability
```

---

## 🛠️ Estado Atual do Projeto

### **Branch Status**
| Branch | Status | Descrição |
|--------|--------|-----------|
| `main` | ✅ Estável | Evolution API em produção |
| `beta` | 🟡 Testing | WhatsApp Official API implementada |
| `feature` | 🔧 Dev | Próximas features em desenvolvimento |

### **Próximos Passos**
1. **Feature Branch**: Desenvolver novas funcionalidades
2. **Beta Testing**: Validar WhatsApp Official API
3. **Production**: Merge para main quando aprovado

---

## 🚨 Comandos Importantes

### **Setup Inicial**
```bash
# Clonar repositório
git clone https://github.com/Pedro004-dot/atlasfy.git
cd atlasfy

# Configurar branches
git checkout beta    # WhatsApp Official API
git checkout feature # Desenvolvimento ativo
git checkout main    # Produção estável
```

### **Desenvolvimento Diário**
```bash
# Sempre partir do beta atualizado
git checkout beta && git pull origin beta
git checkout feature && git merge beta

# Trabalhar na feature...
git add . && git commit -m "feat: nova funcionalidade"
git push origin feature

# Merge para beta quando pronto
git checkout beta && git merge feature
git push origin beta
```

### **Emergency Hotfix**
```bash
# Partir do main para hotfix crítico
git checkout main && git pull origin main
git checkout -b hotfix/critical-fix

# Fix...
git add . && git commit -m "hotfix: correção crítica"
git push origin hotfix/critical-fix

# Merge urgente
git checkout main && git merge hotfix/critical-fix
git checkout beta && git merge hotfix/critical-fix
git push origin main && git push origin beta
```

---

## ✅ Vantagens Desta Estrutura

### **🎯 Simplicidade**
- Apenas 3 branches principais
- Workflow claro e direto
- Fácil de entender e seguir

### **🔒 Segurança**
- Main sempre estável
- Beta como barreira de qualidade
- Feature para experimentação livre

### **🚀 Agilidade**
- Desenvolvimento rápido em feature
- Testing estruturado em beta
- Deploy confiável para main

### **📈 Escalabilidade**
- Suporta múltiplas features paralelas
- Permite hotfixes urgentes
- Facilita releases planejados

---

**Criado em**: 2025-08-07  
**Versão**: 1.0  
**Status**: ✅ Implementado

🚀 Generated with [Claude Code](https://claude.ai/code)