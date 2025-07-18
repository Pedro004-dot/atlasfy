'use client';

import { useUserProfile, useProfileComplete } from '@/hooks/useUserProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, User, Loader2 } from 'lucide-react';

export function ProfileDebugComponent() {
  const { user, profileStatus, isLoading, error, refreshProfile } = useUserProfile();
  const { isComplete, isLoading: isCheckingComplete } = useProfileComplete();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Debug - Status do Perfil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status de Carregamento */}
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              {isLoading ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Carregando...
                </Badge>
              ) : error ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Erro
                </Badge>
              ) : (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Carregado
                </Badge>
              )}
            </div>

            {/* Status do Perfil */}
            <div className="flex items-center gap-2">
              <span className="font-medium">Perfil Completo:</span>
              {isCheckingComplete ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isComplete ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Sim
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Não
                </Badge>
              )}
            </div>

            {/* Informações do Usuário */}
            {user && (
              <div className="space-y-2">
                <h4 className="font-medium">Dados do Usuário:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Nome:</span> {user.nome}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {user.email}
                  </div>
                  <div>
                    <span className="font-medium">Telefone:</span> {user.telefone || 'Não informado'}
                  </div>
                  <div>
                    <span className="font-medium">CPF/CNPJ:</span> {user.cpf_cnpj || 'Não informado'}
                  </div>
                  <div>
                    <span className="font-medium">Endereço:</span> {user.endereco || 'Não informado'}
                  </div>
                  <div>
                    <span className="font-medium">Bairro:</span> {user.bairro || 'Não informado'}
                  </div>
                  <div>
                    <span className="font-medium">CEP:</span> {user.cep || 'Não informado'}
                  </div>
                  <div>
                    <span className="font-medium">Tipo Pessoa:</span> {user.tipo_pessoa || 'Não informado'}
                  </div>
                  <div>
                    <span className="font-medium">Faturamento:</span> {
                      user.faturamento_mensal ? 
                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(user.faturamento_mensal) : 
                        'Não informado'
                    }
                  </div>
                  <div>
                    <span className="font-medium">Conta Bancária:</span> {user.conta_bancaria_id || 'Não criada'}
                  </div>
                </div>
              </div>
            )}

            {/* Campos Faltantes */}
            {profileStatus && !profileStatus.isComplete && (
              <div className="space-y-2">
                <h4 className="font-medium">Campos Faltantes:</h4>
                <div className="flex flex-wrap gap-1">
                  {profileStatus.missingFields.map((field) => (
                    <Badge key={field} variant="outline" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Ações */}
            <div className="flex gap-2">
              <Button
                onClick={refreshProfile}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                Atualizar
              </Button>
              
              {profileStatus && !profileStatus.isComplete && (
                <Button
                  onClick={() => {
                    const currentUrl = window.location.pathname;
                    window.location.href = `/completar-perfil?redirect=${encodeURIComponent(currentUrl)}`;
                  }}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Completar Perfil
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para testar em qualquer página
export function ProfileStatusIndicator() {
  const { isComplete, isLoading } = useProfileComplete();

  if (isLoading) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge 
        variant={isComplete ? "default" : "secondary"}
        className={isComplete ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
      >
        {isComplete ? "Perfil Completo" : "Perfil Incompleto"}
      </Badge>
    </div>
  );
}