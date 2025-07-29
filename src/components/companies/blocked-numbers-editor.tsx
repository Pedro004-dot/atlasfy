'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShieldX, X, Plus, AlertTriangle } from 'lucide-react';

interface BlockedNumbersEditorProps {
  initialNumbers?: string[];
  onChange: (numbers: string[]) => void;
  disabled?: boolean;
}

export function BlockedNumbersEditor({ initialNumbers = [], onChange, disabled = false }: BlockedNumbersEditorProps) {
  const [currentNumber, setCurrentNumber] = useState('');
  const [blockedNumbers, setBlockedNumbers] = useState<string[]>(initialNumbers);
  const [currentError, setCurrentError] = useState<string>('');

  // Sync with parent when initialNumbers change
  useEffect(() => {
    setBlockedNumbers(initialNumbers);
  }, [initialNumbers]);

  // Notify parent when numbers change
  useEffect(() => {
    onChange(blockedNumbers);
  }, [blockedNumbers]); // Remove onChange das dependências

  const validatePhoneNumber = (number: string): string | null => {
    if (!number) return 'Número é obrigatório';
    if (!/^\d+$/.test(number)) return 'Apenas números são permitidos';
    if (number.length !== 12) return 'Número deve ter exatamente 12 dígitos (sem o 9 adicional)';
    if (!number.startsWith('55')) return 'Número deve começar com código do país 55';
    
    const ddd = number.substring(2, 4);
    const phoneNumber = number.substring(4);
    
    if (!/^[1-9][0-9]$/.test(ddd)) return 'DDD inválido (deve ser entre 11 e 99)';
    if (phoneNumber.length !== 8) return 'Número deve ter 8 dígitos após o DDD (sem o 9 adicional)';
    if (!/^\d{8}$/.test(phoneNumber)) return 'Número deve conter apenas dígitos';
    if (blockedNumbers.includes(number)) return 'Este número já foi adicionado';
    
    return null;
  };

  const formatPhoneDisplay = (number: string): string => {
    if (number.length !== 12) return number;
    return `+${number.substring(0, 2)} (${number.substring(2, 4)}) ${number.substring(4, 8)}-${number.substring(8)}`;
  };

  const handleAddNumber = () => {
    if (disabled) return;
    
    const cleanNumber = currentNumber.replace(/\D/g, '');
    const error = validatePhoneNumber(cleanNumber);
    
    if (error) {
      setCurrentError(error);
      return;
    }

    const updatedNumbers = [...blockedNumbers, cleanNumber];
    setBlockedNumbers(updatedNumbers);
    setCurrentNumber('');
    setCurrentError('');
  };

  const handleRemoveNumber = (numberToRemove: string) => {
    if (disabled) return;
    
    const updatedNumbers = blockedNumbers.filter(num => num !== numberToRemove);
    setBlockedNumbers(updatedNumbers);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNumber();
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Number Section */}
      <div className="space-y-2">
        <Label htmlFor="phone-number" className="atlas-label">
          Adicionar Número para Bloqueio
        </Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              id="phone-number"
              type="text"
              value={currentNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                if (value.length <= 12) {
                  setCurrentNumber(value);
                  setCurrentError('');
                }
              }}
              onKeyPress={handleKeyPress}
              maxLength={12}
              className="atlas-input"
              placeholder="553196997292"
              style={{ borderRadius: 'var(--radius-sm)' }}
              disabled={disabled}
            />
            {currentError && (
              <p className="text-destructive text-xs mt-1">{currentError}</p>
            )}
          </div>
          <Button
            type="button"
            onClick={handleAddNumber}
            disabled={!currentNumber || disabled}
            className="atlas-button-secondary"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Formato: 12 dígitos sem pontuação - Obrigatório código país 55, DDD e número sem o 9 adicional
        </p>
      </div>

      {/* Format Example */}
      <div className="bg-primary/5 border border-primary/20 p-3" style={{ borderRadius: 'var(--radius-sm)' }}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-primary">Exemplo de formato correto:</p>
            <p className="text-xs text-primary/80 mt-1">
              <span className="font-mono bg-primary/10 px-1 rounded">553196997292</span>
              <br />
              55 (país) + 31 (DDD) + 96997292 (número sem o 9 adicional)
            </p>
          </div>
        </div>
      </div>

      {/* Blocked Numbers List */}
      {blockedNumbers.length > 0 && (
        <div className="space-y-2">
          <h4 className="atlas-heading font-medium text-foreground">
            Números Bloqueados ({blockedNumbers.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {blockedNumbers.map((number, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-background p-3 border"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-xs">
                    {formatPhoneDisplay(number)}
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveNumber(number)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Information Card */}
      <div className="bg-blue-50 border border-blue-200 p-4" style={{ borderRadius: 'var(--radius)' }}>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-100 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-sm)' }}>
            <ShieldX className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h4 className="atlas-heading font-medium text-blue-800 mb-1">Como funciona o bloqueio</h4>
            <ul className="atlas-text text-sm text-blue-700 space-y-1">
              <li>• O agente não responderá e nem monitorará conversas destes números</li>
              <li>• A configuração pode ser alterada posteriormente</li>
              <li>• Números bloqueados não contam nas estatísticas de atendimento</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}