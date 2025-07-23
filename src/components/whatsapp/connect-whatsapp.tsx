'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Smartphone, RefreshCw, AlertCircle, CheckCircle, Clock, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { ConnectionStatusResponse } from '@/types';
import { cn } from '@/lib/utils';

interface ConnectWhatsAppProps {
  agentId?: string;
  agentType: string; // Adiciona agentType como prop obrigatória
  onConnectionSuccess?: (phoneNumber: string, profileName?: string) => void;
  onConnectionError?: (error: string) => void;
  className?: string;
}

type ConnectionStatus = 'idle' | 'pending' | 'connected' | 'expired' | 'error' | 'qrcode';

export function ConnectWhatsApp({ 
  agentId, 
  agentType, // Adiciona agentType aqui
  onConnectionSuccess, 
  onConnectionError,
  className 
}: ConnectWhatsAppProps) {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [qrCode, setQrCode] = useState<string>('');
  const [instanceName, setInstanceName] = useState<string>('');
  const [connectionStartTime, setConnectionStartTime] = useState<number | null>(null);
  const [lastQrUpdate, setLastQrUpdate] = useState<number | null>(null);
  const [connectionDuration, setConnectionDuration] = useState<number>(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(5);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const { addToast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const POLLING_INTERVAL = 4000; // 4 seconds
  const CONNECTION_TIMEOUT = 2 * 60 * 1000; // 2 minutes
  const QR_REFRESH_TIMEOUT = 30 * 1000; // 30 seconds

  // Generate unique instance name
  const generateInstanceName = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `agent_${agentId || 'default'}_${timestamp}_${random}`;
  }, [agentId]);

  // Get auth token
  const getAuthToken = useCallback(() => {
    return localStorage.getItem('auth-token');
  }, []);

  // Clear all intervals and timeouts
  const clearAllTimers = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // Start connection duration timer
  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    durationIntervalRef.current = setInterval(() => {
      if (connectionStartTime) {
        setConnectionDuration(Date.now() - connectionStartTime);
      }
    }, 1000);
  }, [connectionStartTime]);

  // Format duration for display
  const formatDuration = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Poll connection status
  const pollConnectionStatus = useCallback(async (instanceName: string, agentType: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        setStatus('error');
        setErrorMessage('Token de autenticação não encontrado');
        return;
      }

      const response = await fetch(`/api/user-connection-status/${instanceName}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          setStatus('error');
          setErrorMessage('Conexão não encontrada');
          return;
        }
        throw new Error('Erro ao verificar status da conexão');
      }

      const result: { success: boolean; data: ConnectionStatusResponse } = await response.json();
      
      if (result.success && result.data) {
        const { qrCode: newQrCode, status: newStatus, phoneNumber, profileName, attemptsRemaining: attempts } = result.data;

        // Update QR code if it changed
        if (newQrCode && newQrCode !== qrCode) {
          console.log('QR Code updated:', {
            hasQrCode: !!newQrCode,
            qrCodeLength: newQrCode.length,
            isValidBase64: newQrCode.startsWith('data:image/')
          });
          setQrCode(newQrCode);
          setLastQrUpdate(Date.now());
        }

        // Update attempts remaining
        setAttemptsRemaining(attempts);

        // Handle status changes
        if (newStatus !== status) {
          setStatus(newStatus);

          switch (newStatus) {
            case 'connected':
              clearAllTimers();
              addToast({
                type: 'success',
                message: `WhatsApp conectado com sucesso! ${phoneNumber ? `Número: ${phoneNumber}` : ''}`,
                duration: 5000
              });
              onConnectionSuccess?.(phoneNumber || '', profileName);
              break;

            case 'expired':
              clearAllTimers();
              addToast({
                type: 'warning',
                message: 'QR Code expirado. Gere um novo para continuar.',
                duration: 5000
              });
              break;

            case 'error':
              clearAllTimers();
              const errorMsg = 'Erro na conexão. Tente novamente.';
              setErrorMessage(errorMsg);
              addToast({
                type: 'error',
                message: errorMsg,
                duration: 5000
              });
              onConnectionError?.(errorMsg);
              break;
          }
        }
      }
    } catch (error: any) {
      console.error('Erro ao verificar status:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Erro ao verificar status da conexão');
    }
  }, [status, qrCode, getAuthToken, addToast, onConnectionSuccess, onConnectionError, clearAllTimers]);

  // Start polling
  const startPolling = useCallback((instanceName: string, agentType: string) => {
    // Clear existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Start polling immediately
    pollConnectionStatus(instanceName, agentType);

    // Set up interval for continuous polling
    pollingIntervalRef.current = setInterval(() => {
      pollConnectionStatus(instanceName, agentType);
    }, POLLING_INTERVAL);
  }, [pollConnectionStatus]);

  // Start connection timeout
  const startConnectionTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (status === 'pending') {
        setStatus('expired');
        clearAllTimers();
        addToast({
          type: 'warning',
          message: 'Tempo limite atingido. Gere um novo QR Code.',
          duration: 5000
        });
      }
    }, CONNECTION_TIMEOUT);
  }, [status, addToast, clearAllTimers]);

  // Initiate WhatsApp connection
  const initiateConnection = useCallback(async () => {
    try {
      setStatus('pending');
      setErrorMessage('');
      setQrCode('');
      const startTime = Date.now();
      setConnectionStartTime(startTime);
      setConnectionDuration(0);

      const token = getAuthToken();
      if (!token) {
        setStatus('error');
        setErrorMessage('Token de autenticação não encontrado');
        return;
      }

      const newInstanceName = generateInstanceName();
      setInstanceName(newInstanceName);

      addToast({
        type: 'info',
        message: 'Iniciando conexão WhatsApp...'
      });

      const response = await fetch('/api/evolution/create-instance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          instanceName: newInstanceName,
          ...(agentId && { agentId: agentId }), // Só inclui se agentId for válido
          agentType: agentType
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setStatus('error');
        setErrorMessage(result.error || result.message || 'Erro ao iniciar conexão');
        return;
      }

      // Espera o QR code na resposta
      const qrCodeBase64 = result.data?.qrCode;
      if (qrCodeBase64) {
        setQrCode(qrCodeBase64);
        setStatus('qrcode');
        setLastQrUpdate(Date.now());
        
        // Iniciar polling para verificar status
        startPolling(newInstanceName, agentType);
        startConnectionTimeout();
        startDurationTimer();
      } else {
        // Se não há QR code imediatamente, iniciar polling para verificar
        setStatus('pending');
        startPolling(newInstanceName, agentType);
        startConnectionTimeout();
        startDurationTimer();
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Erro ao iniciar conexão');
    }
  }, [agentId, agentType]);

  // Handler para botão de iniciar conexão
  const handleInitiateConnection = useCallback(() => {
    initiateConnection();
  }, [initiateConnection]);

  // Handler para gerar novo QR code (nova instância)
  const handleGenerateNewQrCode = useCallback(() => {
    setQrCode('');
    setStatus('idle');
    setErrorMessage('');
    initiateConnection();
  }, [initiateConnection]);

  // Stop connection
  const stopConnection = useCallback(async () => {
    if (!instanceName) return;

    try {
      clearAllTimers();
      
      const token = getAuthToken();
      if (token) {
        await fetch(`/api/user-connection-status/${instanceName}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }

      setStatus('idle');
      setQrCode('');
      setInstanceName('');
      setConnectionStartTime(null);
      setConnectionDuration(0);
      setErrorMessage('');
      setAttemptsRemaining(5);

    } catch (error: any) {
      console.error('Erro ao parar conexão:', error);
    }
  }, [instanceName, getAuthToken, clearAllTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // Render status icon
  const renderStatusIcon = () => {
    switch (status) {
      case 'idle':
        return <MessageSquare className="h-8 w-8 text-gray-400" />;
      case 'pending':
        return <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />;
      case 'connected':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'expired':
        return <Clock className="h-8 w-8 text-orange-500" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      case 'qrcode':
        return <QrCode className="h-8 w-8 text-purple-500" />;
      default:
        return <MessageSquare className="h-8 w-8 text-gray-400" />;
    }
  };

  // Render status message
  const renderStatusMessage = () => {
    switch (status) {
      case 'idle':
        return 'Pronto para conectar o WhatsApp';
      case 'pending':
        return 'Aguardando leitura do QR Code...';
      case 'connected':
        return 'WhatsApp conectado com sucesso!';
      case 'expired':
        return 'QR Code expirado';
      case 'error':
        return errorMessage || 'Erro na conexão';
      case 'qrcode':
        return 'Escaneie o QR Code com seu WhatsApp';
      default:
        return '';
    }
  };

  return (
    <div className={cn('max-w-md mx-auto p-6 bg-white rounded-lg border', className)}>
      {/* QR Code Display */}
      {(status === 'pending' || status === 'qrcode') && (
        <div className="mb-6">
          {qrCode ? (
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
              <img
                src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                alt="WhatsApp QR Code"
                className="w-full h-auto max-w-xs mx-auto"
              />
            </div>
          ) : (
            <div className="bg-gray-100 p-4 rounded-lg border-2 border-dashed border-gray-300 text-center">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-500">Gerando QR Code...</p>
                <p className="text-xs text-gray-400">Aguarde alguns segundos</p>
              </div>
            </div>
          )}
          <div className="mt-3 text-center">
            <p className="text-sm text-gray-600 mb-2">
              <Smartphone className="inline h-4 w-4 mr-1" />
              Escaneie com o WhatsApp do seu celular
            </p>
            {attemptsRemaining < 5 && (
              <p className="text-xs text-orange-600">
                Tentativas restantes: {attemptsRemaining}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {status === 'idle' && (
          <Button 
            onClick={handleInitiateConnection} 
            className="w-full"
            size="lg"
          >
            Iniciar conexão WhatsApp
          </Button>
        )}
        {status === 'qrcode' && qrCode && (
          <div className="flex flex-col items-center space-y-4">
            <img 
              src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} 
              alt="QR Code" 
              className="w-64 h-64" 
            />
            <Button onClick={handleGenerateNewQrCode} variant="outline">
              Gerar novo QR code
            </Button>
          </div>
        )}

        {status === 'pending' && (
          <div className="space-y-2">
            <Button 
              onClick={handleGenerateNewQrCode} 
              variant="outline" 
              className="w-full"
              size="lg"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Gerar Novo QR Code
            </Button>
            <Button 
              onClick={stopConnection} 
              variant="ghost" 
              className="w-full"
              size="sm"
            >
              Cancelar
            </Button>
          </div>
        )}

        {(status === 'expired' || status === 'error') && (
          <Button 
            onClick={handleGenerateNewQrCode} 
            className="w-full"
            size="lg"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        )}

        {status === 'connected' && (
          <Button 
            onClick={stopConnection} 
            variant="outline" 
            className="w-full"
            size="lg"
          >
            Desconectar
          </Button>
        )}
      </div>

      {/* Instructions */}
      {status === 'pending' && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Como conectar:
          </h4>
          <ol className="text-xs text-blue-800 space-y-1">
            <li>1. Abra o WhatsApp no seu celular</li>
            <li>2. Toque em &quot;Menu&quot; ou &quot;⋮&quot; no canto superior direito</li>
            <li>3. Selecione &quot;WhatsApp Web&quot;</li>
            <li>4. Escaneie o QR Code acima</li>
          </ol>
        </div>
      )}
    </div>
  );
}