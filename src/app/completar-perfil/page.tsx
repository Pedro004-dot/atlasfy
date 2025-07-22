'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';
import { UserProfileFormData } from '@/lib/validations';
import { ProtectedPage } from '@/components/auth/ProtectedPage';

export default function CompletarPerfilPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState<UserProfileFormData>({
    cpf_cnpj: '',
    faturamento_mensal: 0,
    endereco: '',
    bairro: '',
    cep: '',
    tipo_pessoa: 'FISICA',
    telefone: '',
    email: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUserProfile();
  }, []);

  const checkUserProfile = async () => {
    try {
      // Tentar buscar token em ambos os locais possíveis
      const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
      
      if (!token) {
        console.log('Token não encontrado no localStorage');
        router.push('/login');
        return;
      }

      console.log('Token encontrado, fazendo requisição para verificar perfil...');
      console.log('=== FRONTEND DEBUG ===');
      console.log('Dados atuais do formData:', formData);
      console.log('======================');

      let userId;
      try {
        // Tentar decodificar o token JWT
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.userId;
        console.log('UserId extraído do token:', userId);
      } catch (tokenError) {
        console.error('Erro ao decodificar token:', tokenError);
        localStorage.removeItem('token');
        localStorage.removeItem('auth-token');
        router.push('/login');
        return;
      }

      const response = await fetch('/api/auth/perfil', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': userId,
        },
      });

      console.log('Resposta da API:', response.status, response.statusText);

      if (!response.ok) {
        // Se for erro de autenticação, limpar tokens e redirecionar
        if (response.status === 401 || response.status === 403) {
          console.log('Token inválido ou expirado, redirecionando para login');
          localStorage.removeItem('token');
          localStorage.removeItem('auth-token');
          router.push('/login');
          return;
        }
        
        // Para outros erros, tentar continuar com dados vazios
        console.error('Erro na API, mas continuando:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro detalhado:', errorData);
        
        // Criar um usuário básico para não travar a página
        setUser({
          nome: 'Usuário',
          email: '',
          perfil_completo: false,
        });
        return;
      }

      const data = await response.json();
      console.log('Dados do usuário recebidos:', data);
      
      setUser(data.data.user);
      
      // Se o perfil já estiver completo, redirecionar
      if (data.data.user.perfil_completo) {
        console.log('Perfil já completo, redirecionando...');
        const redirectUrl = searchParams.get('redirect') || '/dashboard';
        router.push(redirectUrl);
        return;
      }

      // Pré-preencher dados já existentes
      setFormData(prev => ({
        ...prev,
        cpf_cnpj: data.data.user.cpf_cnpj || '',
        faturamento_mensal: data.data.user.faturamento_mensal || 0,
        endereco: data.data.user.endereco || '',
        bairro: data.data.user.bairro || '',
        cep: data.data.user.cep || '',
        tipo_pessoa: data.data.user.tipo_pessoa || 'FISICA',
        telefone: data.data.user.telefone || '',
        email: data.data.user.email || '',
      }));
      
      console.log('Perfil carregado com sucesso');
    } catch (error) {
      console.error('Erro ao verificar perfil:', error);
      
      // Mostrar erro mais detalhado
      addToast({
        message: `Erro ao carregar perfil: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        type: 'error',
      });
      
      // Não redirecionar imediatamente, dar uma chance para o usuário ver o erro
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  };

  const handleChange = (field: keyof UserProfileFormData, value: string | number) => {
    if (field === 'telefone') {
      // Remove tudo que não for número
      const cleaned = String(value).replace(/\D/g, '');
      // Só permite até 11 dígitos
      if (cleaned.length > 11) return;
      setFormData(prev => ({
        ...prev,
        [field]: cleaned,
      }));
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: '',
        }));
      }
      return;
    }
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const formatCpfCnpj = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length <= 11) {
      // CPF: 000.000.000-00
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      // CNPJ: 00.000.000/0000-00
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const formatCep = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Validação do telefone
    if ((formData.telefone || '').length !== 11) {
      setErrors(prev => ({
        ...prev,
        telefone: 'O telefone deve conter exatamente 11 dígitos (DDD + 9 + número).',
      }));
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
      if (!token) {
        router.push('/login');
        return;
      }

      let userId;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.userId;
      } catch (tokenError) {
        console.error('Erro ao decodificar token no submit:', tokenError);
        localStorage.removeItem('token');
        localStorage.removeItem('auth-token');
        router.push('/login');
        return;
      }

      console.log('=== ENVIANDO DADOS PARA API ===');
      const formDataToSend = {
        ...formData,
        telefone:  formData.telefone,
      };
      console.log('formData sendo enviado:', JSON.stringify(formDataToSend, null, 2));
      console.log('===============================');

      const response = await fetch('/api/auth/completar-perfil', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-id': userId,
        },
        body: JSON.stringify(formDataToSend),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const errorMap: Record<string, string> = {};
          data.errors.forEach((error: any) => {
            errorMap[error.field] = error.message;
          });
          setErrors(errorMap);
        } else {
          throw new Error(data.message || 'Erro ao completar perfil');
        }
        return;
      }

      addToast({
        message: 'Perfil completado!',
        type: 'success',
      });

      const redirectUrl = searchParams.get('redirect') || '/dashboard';
      router.push(redirectUrl);
    } catch (error) {
      console.error('Erro ao completar perfil:', error);
      addToast({
        message: error instanceof Error ? error.message : 'Erro ao completar perfil',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedPage>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Complete seu perfil</CardTitle>
            <CardDescription>
              Para criar empresas e gerar links de pagamento, precisamos de algumas informações adicionais.
              Isso nos permitirá criar sua conta bancária automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
          <Alert className="mb-6">       
              <strong>Olá, {user.nome}!</strong> Seus dados serão usados para criar uma conta bancária
              no sistema de pagamentos. Todas as informações são criptografadas e seguras.
              <br></br> 
              <strong>{user.nome}!</strong> Preciso que assim que enviar confira a caixa de email para confirmar o cadastro no banco.          
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo_pessoa">Tipo de pessoa</Label>
                <Select
                  value={formData.tipo_pessoa}
                  onValueChange={(value) => handleChange('tipo_pessoa', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FISICA">Pessoa Física</SelectItem>
                    <SelectItem value="JURIDICA">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tipo_pessoa && (
                  <p className="text-sm text-red-500 mt-1">{errors.tipo_pessoa}</p>
                )}
              </div>

              <div>
                <Label htmlFor="cpf_cnpj">
                  {formData.tipo_pessoa === 'FISICA' ? 'CPF' : 'CNPJ'}
                </Label>
                <Input
                  id="cpf_cnpj"
                  value={formatCpfCnpj(formData.cpf_cnpj)}
                  onChange={(e) => handleChange('cpf_cnpj', e.target.value.replace(/\D/g, ''))}
                  placeholder={formData.tipo_pessoa === 'FISICA' ? '000.000.000-00' : '00.000.000/0000-00'}
                  maxLength={formData.tipo_pessoa === 'FISICA' ? 14 : 18}
                />
                {errors.cpf_cnpj && (
                  <p className="text-sm text-red-500 mt-1">{errors.cpf_cnpj}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => handleChange('telefone', e.target.value)}
                  placeholder="31999999999"
                  maxLength={11}
                />
                {errors.telefone && (
                  <p className="text-sm text-red-500 mt-1">{errors.telefone}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                Não use pontuação no telefone.
              </p>
              </div>

              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="seu.email@exemplo.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="faturamento_mensal">Faturamento mensal estimado</Label>
              <Input
                id="faturamento_mensal"
                type="number"
                value={formData.faturamento_mensal}
                onChange={(e) => handleChange('faturamento_mensal', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                step="0.01"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Valor atual: {formatCurrency(formData.faturamento_mensal)}
              </p>
              {errors.faturamento_mensal && (
                <p className="text-sm text-red-500 mt-1">{errors.faturamento_mensal}</p>
              )}
            </div>

            <div>
              <Label htmlFor="endereco">Endereço completo</Label>
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={(e) => handleChange('endereco', e.target.value)}
                placeholder="Rua, número, complemento"
              />
              {errors.endereco && (
                <p className="text-sm text-red-500 mt-1">{errors.endereco}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) => handleChange('bairro', e.target.value)}
                  placeholder="Nome do bairro"
                />
                {errors.bairro && (
                  <p className="text-sm text-red-500 mt-1">{errors.bairro}</p>
                )}
              </div>

              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formatCep(formData.cep)}
                  onChange={(e) => handleChange('cep', e.target.value.replace(/\D/g, ''))}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {errors.cep && (
                  <p className="text-sm text-red-500 mt-1">{errors.cep}</p>
                )}
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Completando perfil...' : 'Completar perfil'}
              </Button>
            </div>
          </form>
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}