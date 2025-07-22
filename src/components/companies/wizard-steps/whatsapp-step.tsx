'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Smartphone, HelpCircle } from 'lucide-react';
import { ConnectWhatsApp } from '@/components/whatsapp/connect-whatsapp';

interface WhatsAppConnectionData {
  connected: boolean;
  phoneNumber?: string;
  profileName?: string;
  instanceName?: string;
}

interface WhatsAppStepProps {
  data: WhatsAppConnectionData;
  onNext: (data: WhatsAppConnectionData) => void;
  onPrevious: () => void;
  empresaId?: string;
  agentType?: string; // Setor da empresa será usado como agentType
}

export function WhatsAppStep({ data, onNext, onPrevious, empresaId, agentType }: WhatsAppStepProps) {
  const [connectionData, setConnectionData] = useState<WhatsAppConnectionData>(data);
  
  // Debug log para verificar agentType
  console.log('WhatsAppStep - agentType received:', agentType);

  const handleConnectionSuccess = (phoneNumber: string, profileName?: string) => {
    const updatedData = {
      connected: true,
      phoneNumber,
      profileName,
      instanceName: `empresa_${empresaId || 'temp'}_${Date.now()}`
    };
    setConnectionData(updatedData);
  };

  const handleConnectionError = (error: string) => {
    console.error('WhatsApp connection error:', error);
    setConnectionData(prev => ({
      ...prev,
      connected: false
    }));
  };

  const handleNext = () => {
    onNext(connectionData);
  };

  const handleSkip = () => {
    onNext({
      connected: false
    });
  };

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
            ? "Conecte sua conta do WhatsApp para monitorar conversas com o Agente Sentinela"
            : "Conecte sua conta do WhatsApp para ativar os agentes de vendas"
          }
        </p>
        {agentType && agentType !== "empresa" && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
            <span>{agentType === 'sentinela' ? '🔍 Agente:' : '🎯 Setor:'}</span>
            <span className="font-medium">{agentType === 'sentinela' ? 'Sentinela' : agentType}</span>
          </div>
        )}
      </div>

      {/* Connection Status */}
      {connectionData.connected ? (
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="atlas-heading font-semibold text-green-800">
                WhatsApp Conectado!
              </h3>
              <p className="atlas-text text-sm text-green-700">
                Sua conta foi conectada com sucesso
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
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-100 rounded">
            <p className="text-xs text-green-800">
              {agentType === 'sentinela'
                ? "✓ Seu Agente Sentinela já pode monitorar conversas do WhatsApp"
                : "✓ Seu agente de vendas já pode receber e enviar mensagens via WhatsApp"
              }
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Connection Component */}
          <div className="bg-muted p-6" style={{ borderRadius: 'var(--radius)' }}>
            <ConnectWhatsApp
              agentId={empresaId}
              agentType={agentType || "empresa"}
              onConnectionSuccess={handleConnectionSuccess}
              onConnectionError={handleConnectionError}
              className="max-w-none mx-0 p-0 bg-transparent border-0"
            />
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 p-4" style={{ borderRadius: 'var(--radius)' }}>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-sm)' }}>
                <HelpCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="atlas-heading font-medium text-blue-900 mb-2">
                  Como funciona a conexão WhatsApp
                </h4>
                <ul className="atlas-text text-sm text-blue-800 space-y-1">
                  <li>• Escaneie o QR Code com o WhatsApp do seu celular</li>
                  {agentType === 'sentinela' ? (
                    <>
                      <li>• O Agente Sentinela monitora todas as conversas automaticamente</li>
                      <li>• Gera insights e relatórios sobre seus clientes</li>
                      <li>• Organiza conversas por status e prioridade</li>
                    </>
                  ) : (
                    <>
                      <li>• A conexão permite que os agentes respondam automaticamente</li>
                      <li>• Você pode gerenciar múltiplas conversas simultaneamente</li>
                    </>
                  )}
                  <li>• Os dados ficam seguros e criptografados</li>
                  {agentType && agentType !== "empresa" && agentType !== "sentinela" && (
                    <li>• ⚙️ Configurado para o setor: <strong>{agentType}</strong></li>
                  )}
                </ul>
              </div>
            </div>
          </div>
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
          <Button
            type="button"
            onClick={handleSkip}
            variant="outline"
            className="atlas-button-secondary"
            style={{ borderRadius: 'var(--radius)' }}
          >
            Pular Esta Etapa
          </Button>
          
          <Button
            onClick={handleNext}
            className="atlas-button-primary"
            style={{ borderRadius: 'var(--radius)' }}
          >
            {connectionData.connected ? 'Continuar' : 'Continuar Sem WhatsApp'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}