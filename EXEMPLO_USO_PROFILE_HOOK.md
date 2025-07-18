# Exemplo de Uso do Hook useUserProfile

## 1. Hook useUserProfile

O hook `useUserProfile` fornece acesso completo ao perfil do usuário e seu status:

```typescript
import { useUserProfile } from '@/hooks/useUserProfile';

function MeuComponente() {
  const { user, profileStatus, isLoading, error, checkProfile } = useUserProfile();

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h1>Olá, {user?.nome}</h1>
      <p>Perfil completo: {profileStatus?.isComplete ? 'Sim' : 'Não'}</p>
      
      {!profileStatus?.isComplete && (
        <div>
          <p>Campos faltantes:</p>
          <ul>
            {profileStatus?.missingFields.map(field => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## 2. Hook useProfileComplete (Mais Simples)

Para casos onde você só precisa saber se o perfil está completo:

```typescript
import { useProfileComplete } from '@/hooks/useUserProfile';

function BotaoCriarEmpresa() {
  const { isComplete, isLoading, checkComplete } = useProfileComplete();

  const handleClick = async () => {
    if (!isComplete) {
      // Redirecionar para completar perfil
      const currentUrl = window.location.pathname;
      window.location.href = `/completar-perfil?redirect=${encodeURIComponent(currentUrl)}`;
      return;
    }
    
    // Prosseguir com criação da empresa
    console.log('Pode criar empresa!');
  };

  return (
    <button 
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? 'Verificando...' : 'Criar Empresa'}
    </button>
  );
}
```

## 3. Verificação Programática

Para verificações pontuais sem hook:

```typescript
import { checkUserProfile, redirectToProfileCompletion } from '@/lib/profileCheck';

async function handleActionThatRequiresProfile() {
  const profileCheck = await checkUserProfile();
  
  if (!profileCheck.isComplete) {
    // Redirecionar para completar perfil
    redirectToProfileCompletion(window.location.pathname);
    return;
  }
  
  // Prosseguir com a ação
  console.log('Perfil completo, pode prosseguir!');
}
```

## 4. Componente de Proteção

Para proteger rotas ou componentes:

```typescript
import { useProfileComplete } from '@/hooks/useUserProfile';

function ProtectedComponent({ children }: { children: React.ReactNode }) {
  const { isComplete, isLoading } = useProfileComplete();

  if (isLoading) {
    return <div>Verificando perfil...</div>;
  }

  if (!isComplete) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p>Você precisa completar seu perfil para acessar esta funcionalidade.</p>
        <button 
          onClick={() => {
            const currentUrl = window.location.pathname;
            window.location.href = `/completar-perfil?redirect=${encodeURIComponent(currentUrl)}`;
          }}
          className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded"
        >
          Completar Perfil
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

// Uso:
function MinhaFuncionalidade() {
  return (
    <ProtectedComponent>
      <div>Conteúdo que requer perfil completo</div>
    </ProtectedComponent>
  );
}
```

## 5. Integração com Formulários

```typescript
import { useUserProfile } from '@/hooks/useUserProfile';

function FormularioCriarEmpresa() {
  const { user, profileStatus, isLoading } = useUserProfile();

  const handleSubmit = async (formData: any) => {
    if (!profileStatus?.isComplete) {
      alert('Complete seu perfil antes de criar uma empresa');
      return;
    }

    // Prosseguir com criação
    try {
      const response = await fetch('/api/empresas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.code === 'PROFILE_INCOMPLETE') {
          // Tratar especificamente erro de perfil incompleto
          window.location.href = error.redirectTo;
          return;
        }
        throw new Error(error.message);
      }

      // Sucesso
      const empresa = await response.json();
      console.log('Empresa criada:', empresa);
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
    }
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <form onSubmit={handleSubmit}>
      {!profileStatus?.isComplete && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
          <p className="text-yellow-800">
            ⚠️ Complete seu perfil para criar empresas
          </p>
          <button 
            type="button"
            onClick={() => {
              const currentUrl = window.location.pathname;
              window.location.href = `/completar-perfil?redirect=${encodeURIComponent(currentUrl)}`;
            }}
            className="mt-2 text-yellow-600 underline"
          >
            Completar agora
          </button>
        </div>
      )}
      
      {/* Campos do formulário */}
      <input type="text" placeholder="Nome da empresa" />
      
      <button 
        type="submit"
        disabled={!profileStatus?.isComplete}
      >
        Criar Empresa
      </button>
    </form>
  );
}
```

## 6. Tipos TypeScript

```typescript
interface UserProfile {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  cpf_cnpj?: string;
  faturamento_mensal?: number;
  endereco?: string;
  bairro?: string;
  cep?: string;
  tipo_pessoa?: 'FISICA' | 'JURIDICA';
  perfil_completo: boolean;
  conta_bancaria_id?: string;
  created_at: string;
  updated_at: string;
}

interface ProfileStatus {
  isComplete: boolean;
  missingFields: string[];
}
```

## 7. Campos Obrigatórios

Os seguintes campos são obrigatórios para completar o perfil:

- `cpf_cnpj`: CPF ou CNPJ
- `faturamento_mensal`: Faturamento mensal
- `endereco`: Endereço completo
- `bairro`: Bairro
- `cep`: CEP
- `tipo_pessoa`: 'FISICA' ou 'JURIDICA'
- `telefone`: Telefone (opcional mas recomendado)

## 8. Fluxo de Uso

1. **Usuário se cadastra** com nome, email e senha
2. **Sistema verifica perfil** automaticamente
3. **Se incompleto**, mostra banner no header e bloqueia criação de empresas
4. **Usuário completa perfil** na página `/completar-perfil`
5. **Sistema cria conta bancária** automaticamente
6. **Usuário pode criar empresas** livremente

## 9. Estados Possíveis

- `isLoading: true` - Verificando perfil
- `isComplete: false` - Perfil incompleto
- `isComplete: true` - Perfil completo
- `error: string` - Erro ao verificar perfil