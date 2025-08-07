'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  MessageCircle, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  Smartphone, 
  HelpCircle,
  Settings,
  Shield,
  Zap,
  QrCode,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { ConnectWhatsApp } from '@/components/whatsapp/connect-whatsapp';

// Types for WhatsApp connection
export interface WhatsAppConnectionData {
  connected: boolean;
  connectionType?: 'evolution' | 'official';
  phoneNumber?: string;
  profileName?: string;
  instanceName?: string;
  qrCode?: string;
  // Evolution API specific
  instanceId?: string;
  instanceToken?: string;
  // Official API specific  
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken?: string;
  appSecret?: string;
  webhookUrl?: string;
}

interface WhatsAppConnectionStepProps {
  data: WhatsAppConnectionData;
  onNext: (data: WhatsAppConnectionData) => void;
  onPrevious: () => void;
  empresaId?: string;
  agentType?: string;
}

export function WhatsAppConnectionStep({ 
  data, 
  onNext, 
  onPrevious, 
  empresaId, 
  agentType 
}: WhatsAppConnectionStepProps) {
  const [connectionData, setConnectionData] = useState<WhatsAppConnectionData>(data);
  const [selectedType, setSelectedType] = useState<'evolution' | 'official' | null>(
    data.connectionType || null
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [businessRulesStatus, setBusinessRulesStatus] = useState<'checking' | 'passed' | 'failed'>('checking');
  const { addToast } = useToast();

  // Initialize business rules validation on mount
  useEffect(() => {
    validateBusinessRules();
  }, [selectedType, connectionData]);

  const validateBusinessRules = async () => {
    if (!selectedType) return;

    setBusinessRulesStatus('checking');
    setErrors([]);

    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setErrors(['Token de autenticação não encontrado']);
        setBusinessRulesStatus('failed');
        return;
      }

      // Validate connection data with business rules
      const validationPayload = {
        connection_type: selectedType,
        phone_number: connectionData.phoneNumber,
        instance_name: connectionData.instanceName,
        agent_type: agentType,
        empresa_id: empresaId
      };

      const response = await fetch('/api/business-rules/validate-connection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validationPayload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setErrors(result.details || [result.error || 'Validação falhou']);
        setBusinessRulesStatus('failed');
        return;
      }

      // Check if all rules passed
      const allRulesPassed = result.data?.results?.every((rule: any) => rule.allowed) ?? true;
      
      if (allRulesPassed) {
        setBusinessRulesStatus('passed');
      } else {
        const failedRules = result.data?.results?.filter((rule: any) => !rule.allowed) || [];
        setErrors(failedRules.map((rule: any) => rule.message));
        setBusinessRulesStatus('failed');
      }

    } catch (error) {
      console.error('Business rules validation error:', error);
      setErrors(['Erro na validação das regras de negócio']);
      setBusinessRulesStatus('failed');
    }
  };

  const handleConnectionTypeSelect = (type: 'evolution' | 'official') => {
    setSelectedType(type);
    setConnectionData(prev => ({
      ...prev,
      connectionType: type,
      connected: false
    }));
  };


  const handleOfficialConnect = async () => {
    setIsConnecting(true);
    setErrors([]);

    try {
      const token = localStorage.getItem('auth-token');
      if (!token) throw new Error('Token não encontrado');

      // Iniciar fluxo OAuth2 com Meta
      const response = await fetch('/api/whatsapp/official/auth/oauth-start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresaId,
          agentType
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao iniciar OAuth');
      }

      // Abrir popup para autorização Meta
      const popup = window.open(
        result.data.authUrl,
        'meta-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup foi bloqueado. Por favor, permita popups para este site.');
      }

      // Monitorar callback do OAuth
      const checkCallback = () => {
        try {
          // Verificar se popup foi fechado
          if (popup.closed) {
            setIsConnecting(false);
            // Verificar se houve sucesso via URL params (caso o usuário tenha fechado)
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('oauth_success')) {
              setConnectionData({
                ...connectionData,
                connected: true,
                connectionType: 'official',
                phoneNumber: urlParams.get('phone_number') || undefined
              });
              
              addToast({
                type: 'success',
                message: 'WhatsApp Business API conectada com sucesso!'
              });
            }
            return;
          }

          // Verificar URL do popup para detectar callback
          try {
            const popupUrl = popup.location.href;
            if (popupUrl.includes('oauth_success=true')) {
              const url = new URL(popupUrl);
              const phoneNumber = url.searchParams.get('phone_number');
              
              popup.close();
              setIsConnecting(false);
              
              setConnectionData({
                ...connectionData,
                connected: true,
                connectionType: 'official',
                phoneNumber: phoneNumber || undefined
              });
              
              addToast({
                type: 'success',
                message: 'WhatsApp Business API conectada com sucesso!'
              });
              return;
            } else if (popupUrl.includes('oauth_error')) {
              const url = new URL(popupUrl);
              const error = url.searchParams.get('oauth_error');
              popup.close();
              throw new Error(error || 'Erro na autorização');
            }
          } catch (e) {
            // Cross-origin error é esperado durante o fluxo OAuth
          }

          // Continuar monitorando
          setTimeout(checkCallback, 1000);
        } catch (error) {
          console.error('Error checking callback:', error);
          setTimeout(checkCallback, 1000);
        }
      };

      // Iniciar monitoramento
      setTimeout(checkCallback, 1000);

    } catch (error: any) {
      setErrors([error.message]);
      addToast({
        type: 'error',
        message: error.message
      });
      setIsConnecting(false);
    }
  };

  const renderConnectionTypeSelector = () => (
    <div className="space-y-4">
      <h3 className="atlas-heading font-medium text-foreground mb-4">
        Escolha o tipo de conexão WhatsApp
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Evolution API Option */}
        <div 
          className={`p-4 border-2 cursor-pointer transition-all ${
            selectedType === 'evolution' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
          style={{ borderRadius: 'var(--radius)' }}
          onClick={() => handleConnectionTypeSelect('evolution')}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-sm)' }}>
              <Zap className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="atlas-heading font-medium text-foreground mb-1">
                Evolution API
              </h4>
              <p className="atlas-text text-sm text-muted-foreground mb-2">
                Solução rápida e fácil de configurar
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• ⚡ Configuração em minutos</li>
                <li>• 📱 QR Code para conectar</li>
                <li>• 🔄 Auto-reconexão</li>
                <li>• 💰 Custo mais baixo</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Official API Option */}
        <div 
          className={`p-4 border-2 cursor-pointer transition-all ${
            selectedType === 'official' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
          style={{ borderRadius: 'var(--radius)' }}
          onClick={() => handleConnectionTypeSelect('official')}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-sm)' }}>
              <Shield className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="atlas-heading font-medium text-foreground mb-1">
                WhatsApp Business API
              </h4>
              <p className="atlas-text text-sm text-muted-foreground mb-2">
                API oficial do WhatsApp (Meta)
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• 🏢 Oficial do WhatsApp</li>
                <li>• 🔒 Máxima segurança</li>
                <li>• 📈 Escalabilidade</li>
                <li>• 🎯 Recursos avançados</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBusinessRulesStatus = () => (
    <div className={`p-3 rounded-lg border ${
      businessRulesStatus === 'checking' ? 'border-yellow-200 bg-yellow-50' :
      businessRulesStatus === 'passed' ? 'border-green-200 bg-green-50' :
      'border-red-200 bg-red-50'
    }`}>
      <div className="flex items-center gap-2">
        {businessRulesStatus === 'checking' && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
            <span className="text-sm text-yellow-800">Validando regras de negócio...</span>
          </>
        )}
        {businessRulesStatus === 'passed' && (
          <>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800">✓ Todas as validações passaram</span>
          </>
        )}
        {businessRulesStatus === 'failed' && (
          <>
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800">⚠ Problemas de validação encontrados</span>
          </>
        )}
      </div>
      
      {errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-xs text-red-700">• {error}</p>
          ))}
        </div>
      )}
    </div>
  );

  const renderEvolutionForm = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Evolution API</h4>
            <p className="text-sm text-blue-800">
              A Evolution API permite conectar facilmente via QR Code. 
              Após conectar, {agentType === 'sentinela' ? 'o Agente Sentinela' : 'seus agentes'} poderão 
              monitorar e responder mensagens automaticamente.
            </p>
          </div>
        </div>
      </div>

      <ConnectWhatsApp 
        agentType={agentType || 'empresa'}
        onConnectionSuccess={(phoneNumber, profileName) => {
          setConnectionData({
            ...connectionData,
            connected: true,
            connectionType: 'evolution',
            phoneNumber,
            profileName
          });
          setIsConnecting(false);
        }}
        onConnectionError={(error) => {
          setErrors([error]);
          addToast({
            type: 'error',
            message: error
          });
          setIsConnecting(false);
        }}
        className="w-full"
      />
    </div>
  );

  const renderOfficialForm = () => (
    <OfficialAPIForm 
      onConnect={handleOfficialConnect}
      isConnecting={isConnecting}
      agentType={agentType}
    />
  );

  const renderConnectionSuccess = () => (
    <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle className="h-8 w-8 text-green-600" />
        <div>
          <h3 className="atlas-heading font-semibold text-green-800">
            WhatsApp Conectado!
          </h3>
          <p className="atlas-text text-sm text-green-700">
            {selectedType === 'evolution' ? 'Evolution API' : 'WhatsApp Business API'} conectada com sucesso
          </p>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded border border-green-200">
        <div className="space-y-2 text-sm">
          {connectionData.phoneNumber && (
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-green-600" />
              <span className="font-medium text-gray-700">Número:</span>
              <span className="text-gray-900">{connectionData.phoneNumber}</span>
            </div>
          )}
          {connectionData.profileName && (
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-gray-700">Perfil:</span>
              <span className="text-gray-900">{connectionData.profileName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-green-600" />
            <span className="font-medium text-gray-700">Tipo:</span>
            <span className="text-gray-900">
              {selectedType === 'evolution' ? 'Evolution API' : 'WhatsApp Business API'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-green-100 rounded">
        <p className="text-xs text-green-800">
          {agentType === 'sentinela'
            ? "✓ Seu Agente Sentinela já pode monitorar conversas do WhatsApp"
            : "✓ Seus agentes já podem receber e enviar mensagens via WhatsApp"
          }
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Step Title */}
      <div className="text-center">
        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mx-auto mb-3" style={{ borderRadius: 'var(--radius)' }}>
          <MessageCircle className="h-6 w-6 text-primary" />
        </div>
        <h2 className="atlas-heading text-xl font-semibold text-foreground mb-1">
          Conectar WhatsApp
        </h2>
        <p className="atlas-muted text-sm">
          {agentType === 'sentinela' 
            ? "Conecte uma conta WhatsApp para monitoramento com Agente Sentinela"
            : "Conecte uma conta WhatsApp para ativar os agentes de vendas"
          }
        </p>
        {agentType && agentType !== "empresa" && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
            <span>{agentType === 'sentinela' ? '🔍 Agente:' : '🎯 Setor:'}</span>
            <span className="font-medium">{agentType === 'sentinela' ? 'Sentinela' : agentType}</span>
          </div>
        )}
      </div>

      {/* Business Rules Status */}
      {selectedType && renderBusinessRulesStatus()}

      {/* Content */}
      {connectionData.connected ? renderConnectionSuccess() : (
        <>
          {!selectedType && renderConnectionTypeSelector()}
          {selectedType === 'evolution' && renderEvolutionForm()}
          {selectedType === 'official' && renderOfficialForm()}
        </>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          onClick={onPrevious}
          variant="outline"
          className="atlas-button-secondary"
          style={{ borderRadius: 'var(--radius)' }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        <div className="flex gap-3">
          {selectedType && !connectionData.connected && (
            <Button
              type="button"
              onClick={() => setSelectedType(null)}
              variant="outline"
              className="atlas-button-secondary"
              disabled={isConnecting}
            >
              Voltar
            </Button>
          )}
          
          <Button
            onClick={() => onNext(connectionData)}
            className="atlas-button-primary"
            disabled={businessRulesStatus === 'failed' || isConnecting}
            style={{ borderRadius: 'var(--radius)' }}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                {connectionData.connected ? 'Continuar' : 'Pular Esta Etapa'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}


// Official API Form Component - OAuth Flow
function OfficialAPIForm({ 
  onConnect, 
  isConnecting,
  agentType 
}: { 
  onConnect: () => void; 
  isConnecting: boolean;
  agentType?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">WhatsApp Business API Oficial</h4>
            <p className="text-sm text-blue-800">
              Conecte-se oficialmente com o WhatsApp através do Meta Business.
              {agentType === 'sentinela' ? ' Ideal para monitoramento em larga escala.' : ' Perfeita para vendas profissionais.'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-900 mb-2">🏆 Solution Partner Oficial</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• ✅ Autorização segura via Meta</li>
              <li>• ✅ Sem necessidade de inserir credenciais manualmente</li>
              <li>• ✅ Conexão automática e criptografada</li>
              <li>• ✅ Webhook configurado automaticamente</li>
              <li>• ✅ Compliance total com políticas Meta</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">f</span>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🔐 Como Funciona</h4>
            <ol className="text-sm text-gray-700 space-y-1">
              <li>1. Clique no botão para abrir autorização Meta</li>
              <li>2. Faça login com sua conta Meta Business</li>
              <li>3. Selecione a conta comercial WhatsApp</li>
              <li>4. Autorize as permissões necessárias</li>
              <li>5. Sua conexão será configurada automaticamente!</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-yellow-800">
              <strong>Pré-requisito:</strong> Você precisa ter uma conta Meta Business com WhatsApp Business API configurada.
              Caso não tenha, acesse <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">business.facebook.com</a>
            </p>
          </div>
        </div>
      </div>

      <Button 
        onClick={onConnect}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Aguardando autorização Meta...
          </>
        ) : (
          <>
            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center mr-2">
              <span className="text-blue-600 font-bold text-xs">f</span>
            </div>
            Autorizar com Meta Business
          </>
        )}
      </Button>

      {isConnecting && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <p className="text-sm text-blue-800 text-center">
            📱 Uma janela popup foi aberta para autorização. Complete o processo na janela do Meta Business.
          </p>
        </div>
      )}
    </div>
  );
}