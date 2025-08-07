'use client';

import React, { useState } from 'react';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Building2, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { 
  EmpresaBasicFormData,
  EmpresaContactFormData,
  AgenteConfigFormData,
  ObjecaoFormData,
  ProdutoFormData,
  WhatsAppConnectionFormData,
  BlockedNumbersFormData,
  GatilhoEscalacaoFormData,
  FollowUpFormData,
  PerguntaQualificacaoFormData,
  EtapaFunilFormData
} from '@/lib/validations/empresa';
import { CreateEmpresaData, Empresa } from '@/types/empresa';

// Import step components
import { BasicInfoStep } from './wizard-steps/basic-info-step';
import { ContactInfoStep } from './wizard-steps/contact-info-step';
import { AgentConfigStep } from './wizard-steps/agent-config-step';
import { ObjectionsStep } from './wizard-steps/objections-step';
import { ProductsStep } from './wizard-steps/products-step';
import { BlockedNumbersStep } from './wizard-steps/blocked-numbers-step';
import { WhatsAppConnectionStep } from './wizard-steps/whatsapp-connection-step';
import { AdvancedConfigStep } from './wizard-steps/advanced-config-step';
import { StepIndicator } from './wizard-steps/step-indicator';
import { AgentTypeSelectionStep, AgentType } from './wizard-steps/agent-type-selection-step';

interface CreateCompanyWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyCreated: (company: Empresa) => void;
  canCreate?: boolean;
}

const SENTINELA_STEPS = [
  { id: 1, name: 'Tipo de Agente', icon: Building2 },
  { id: 2, name: 'Informações Básicas', icon: Building2 },
  { id: 3, name: 'Números Bloqueados', icon: Building2 },
  { id: 4, name: 'WhatsApp', icon: Building2 },
];

const VENDAS_STEPS = [
  { id: 1, name: 'Tipo de Agente', icon: Building2 },
  { id: 2, name: 'Informações Básicas', icon: Building2 },
  { id: 3, name: 'Contato', icon: Building2 },
  { id: 4, name: 'Agente de Vendas', icon: Building2 },
  { id: 5, name: 'Objeções', icon: Building2 },
  { id: 6, name: 'Produtos', icon: Building2 },
  { id: 7, name: 'Números Bloqueados', icon: Building2 },
  { id: 8, name: 'WhatsApp', icon: Building2 },
  { id: 9, name: 'Configurações Avançadas', icon: Building2 },
];

export function CreateCompanyWizard({ 
  isOpen, 
  onClose, 
  onCompanyCreated, 
  canCreate = true 
}: CreateCompanyWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType | undefined>();
  const { addToast } = useToast();

  // Form state for each step
  const [basicInfo, setBasicInfo] = useState<Partial<EmpresaBasicFormData>>({});
  const [contactInfo, setContactInfo] = useState<Partial<EmpresaContactFormData>>({});
  const [agenteConfig, setAgenteConfig] = useState<Partial<AgenteConfigFormData>>({});
  const [objecoes, setObjecoes] = useState<ObjecaoFormData[]>([]);
  const [produtos, setProdutos] = useState<ProdutoFormData[]>([]);
  const [blockedNumbers, setBlockedNumbers] = useState<string[]>([]);
  const [whatsappConnection, setWhatsappConnection] = useState<WhatsAppConnectionFormData>({ connected: false });
  const [gatilhosEscalacao, setGatilhosEscalacao] = useState<Partial<GatilhoEscalacaoFormData>>({});
  const [followUps, setFollowUps] = useState<FollowUpFormData[]>([]);
  const [perguntasQualificacao, setPerguntasQualificacao] = useState<PerguntaQualificacaoFormData[]>([]);
  const [etapasFunil, setEtapasFunil] = useState<EtapaFunilFormData[]>([]);

  // Get current steps based on agent type
  const getCurrentSteps = () => {
    if (!selectedAgentType) return SENTINELA_STEPS; // Default to Sentinela
    return selectedAgentType === AgentType.SENTINELA ? SENTINELA_STEPS : VENDAS_STEPS;
  };

  const reset = () => {
    setCurrentStep(1);
    setSelectedAgentType(undefined);
    setBasicInfo({});
    setContactInfo({});
    setAgenteConfig({});
    setObjecoes([]);
    setProdutos([]);
    setBlockedNumbers([]);
    setWhatsappConnection({ connected: false });
    setGatilhosEscalacao({});
    setFollowUps([]);
    setPerguntasQualificacao([]);
    setEtapasFunil([]);
  };

  const handleNext = () => {
    const currentSteps = getCurrentSteps();
    if (currentStep < currentSteps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    const currentSteps = getCurrentSteps();
    if (step >= 1 && step <= currentSteps.length) {
      setCurrentStep(step);
    }
  };

  const handleStepComplete = (stepData: any) => {
    if (selectedAgentType === AgentType.SENTINELA) {
      // Sentinela flow: 3 steps
      switch (currentStep) {
        case 1:
          setSelectedAgentType(stepData);
          break;
        case 2:
          setBasicInfo(stepData);
          break;
        case 3:
          setBlockedNumbers(stepData.blocked_numbers);
          break;
        case 4:
          setWhatsappConnection(stepData);
          break;
      }
    } else if (selectedAgentType === AgentType.VENDAS) {
      // Vendas flow: 9 steps
      switch (currentStep) {
        case 1:
          setSelectedAgentType(stepData);
          break;
        case 2:
          setBasicInfo(stepData);
          break;
        case 3:
          setContactInfo(stepData);
          break;
        case 4:
          setAgenteConfig(stepData);
          break;
        case 5:
          setObjecoes(stepData);
          break;
        case 6:
          setProdutos(stepData);
          break;
        case 7:
          setBlockedNumbers(stepData.blocked_numbers);
          break;
        case 8:
          setWhatsappConnection(stepData);
          break;
        case 9:
          setGatilhosEscalacao(stepData.gatilhos_escalacao);
          setFollowUps(stepData.follow_ups);
          setPerguntasQualificacao(stepData.perguntas_qualificacao);
          setEtapasFunil(stepData.etapas_funil);
          break;
      }
    } else {
      // First step: agent type selection
      setSelectedAgentType(stepData);
    }
    
    const currentSteps = getCurrentSteps();
    if (currentStep < currentSteps.length) {
      handleNext();
    }
  };


  const onSubmit = async () => {
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('auth-token');
      if (!token) throw new Error('Token não encontrado');

      const formData: CreateEmpresaData = {
        ...basicInfo,
        // Include contact info only for Vendas agent
        ...(selectedAgentType === AgentType.VENDAS ? contactInfo : {}),
        agent_type: selectedAgentType, // Add agent type to form data
        agente_config: Object.keys(agenteConfig).length > 0 ? agenteConfig as AgenteConfigFormData : undefined,
        objecoes: objecoes.length > 0 ? objecoes : undefined,
        produtos: produtos.length > 0 ? produtos : undefined,
        blocked_numbers: blockedNumbers.length > 0 ? blockedNumbers : undefined,
        whatsapp_connection: whatsappConnection.connected ? whatsappConnection : undefined,
        gatilhos_escalacao: Object.keys(gatilhosEscalacao).length > 0 ? gatilhosEscalacao as GatilhoEscalacaoFormData : undefined,
        follow_ups: followUps.length > 0 ? followUps : undefined,
        perguntas_qualificacao: perguntasQualificacao.length > 0 ? perguntasQualificacao : undefined,
        etapas_funil: etapasFunil.length > 0 ? etapasFunil : undefined,
      };

      // Debug log para verificar dados da empresa
      console.log('=== CREATE COMPANY DEBUG ===');
      console.log('Selected Agent Type:', selectedAgentType);
      console.log('Form Data:', formData);
      
      // Validação de telefone apenas para Agente Vendas (que tem contact info)
      if (selectedAgentType === AgentType.VENDAS && formData.telefone) {
        // Adicionar prefixo 55 ao telefone se necessário
        let telefoneFinal = formData.telefone;
        if (telefoneFinal.length === 10 && !telefoneFinal.startsWith('55')) {
          telefoneFinal = '55' + telefoneFinal;
        }
        // Garante que só envie se tiver 12 dígitos (sem o 9 adicional)
        if (telefoneFinal.length !== 12) {
          addToast({
            type: 'error',
            message: 'O telefone deve conter DDD + 8 dígitos e o código do país (ex: 553196997292 - sem o 9 adicional)',
          });
          setIsSubmitting(false);
          return;
        }
        formData.telefone = telefoneFinal;
        console.log('Telefone validado para Agente Vendas:', formData.telefone);
      }
      console.log('============================');

      const response = await fetch('/api/empresas/create-complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar empresa');
      }

      addToast({
        type: 'success',
        message: 'Empresa criada com sucesso!'
      });

      onCompanyCreated(result.empresa);
      handleClose();

    } catch (error: any) {
      addToast({
        type: 'error',
        message: error.message || 'Erro ao criar empresa'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const renderCurrentStep = () => {
    // First step is always agent type selection
    if (currentStep === 1) {
      return (
        <AgentTypeSelectionStep
          selectedType={selectedAgentType}
          onNext={handleStepComplete}
        />
      );
    }

    // Sentinela flow: 4 steps total
    if (selectedAgentType === AgentType.SENTINELA) {
      switch (currentStep) {
        case 2:
          return (
            <BasicInfoStep
              data={basicInfo}
              onNext={handleStepComplete}
              agentType="sentinela"
            />
          );
        case 3:
          return (
            <BlockedNumbersStep
              data={{ blocked_numbers: blockedNumbers }}
              onNext={handleStepComplete}
              onBack={handlePrevious}
            />
          );
        case 4:
          return (
            <WhatsAppConnectionStep
              data={{
                ...whatsappConnection,
                profileName: whatsappConnection.profileName ?? undefined
              }}
              onNext={handleStepComplete}
              onPrevious={handlePrevious}
              empresaId={undefined}
              agentType="sentinela" // Always 'sentinela' for Sentinela agent
            />
          );
        default:
          return null;
      }
    }

    // Vendas flow: 9 steps total
    if (selectedAgentType === AgentType.VENDAS) {
      switch (currentStep) {
        case 2:
          return (
            <BasicInfoStep
              data={basicInfo}
              onNext={handleStepComplete}
              agentType="vendas"
            />
          );
        case 3:
          return (
            <ContactInfoStep
              data={contactInfo}
              onNext={handleStepComplete}
              onPrevious={handlePrevious}
            />
          );
        case 4:
          return (
            <AgentConfigStep
              data={agenteConfig}
              onNext={handleStepComplete}
              onPrevious={handlePrevious}
            />
          );
        case 5:
          return (
            <ObjectionsStep
              data={objecoes}
              onNext={handleStepComplete}
              onPrevious={handlePrevious}
            />
          );
        case 6:
          return (
            <ProductsStep
              data={produtos.map(p => ({ ...p, imagens: p.imagens ?? [] }))}
              onNext={handleStepComplete}
              onPrevious={handlePrevious}
            />
          );
        case 7:
          return (
            <BlockedNumbersStep
              data={{ blocked_numbers: blockedNumbers }}
              onNext={handleStepComplete}
              onBack={handlePrevious}
            />
          );
        case 8:
          return (
            <WhatsAppConnectionStep
              data={{
                ...whatsappConnection,
                profileName: whatsappConnection.profileName ?? undefined
              }}
              onNext={handleStepComplete}
              onPrevious={handlePrevious}
              empresaId={undefined}
              agentType={basicInfo.setor || "empresa"}
            />
          );
        case 9:
          return (
            <AdvancedConfigStep
              gatilhosData={gatilhosEscalacao}
              followUpsData={followUps}
              perguntasData={perguntasQualificacao}
              etapasData={etapasFunil}
              onNext={handleStepComplete}
              onPrevious={handlePrevious}
            />
          );
        default:
          return null;
      }
    }

    return null;
  };

  const currentSteps = getCurrentSteps();
  const isLastStep = currentStep === currentSteps.length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalBody>
        <div className="space-y-6" style={{ fontFamily: 'var(--font-sans)', letterSpacing: 'var(--tracking-normal)' }}>
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 flex items-center justify-center mx-auto mb-4" style={{ borderRadius: 'var(--radius-lg)' }}>
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="atlas-heading text-2xl font-bold text-foreground mb-2">
              Criar Nova Empresa
            </h1>
            <p className="atlas-muted text-sm">
              Configure sua empresa e agente {selectedAgentType || 'sentinela'} em {currentSteps.length} etapas simples
            </p>
          </div>

          {/* Step Indicator */}
          <StepIndicator
            steps={currentSteps}
            currentStep={currentStep}
          />

          {/* Current Step Content */}
          <div className="min-h-[400px]">
            {renderCurrentStep()}
          </div>

          {/* Plan Limitation Warning */}
          {!canCreate && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive rounded text-destructive text-center text-sm">
              Limite de empresas atingido para seu plano. Faça upgrade para criar mais empresas.
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="flex justify-between items-center w-full">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isSubmitting}
                className="atlas-button-secondary"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
            )}
          </div>


          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="atlas-button-secondary"
            >
              Cancelar
            </Button>
            
            {isLastStep ? (
              <Button
                onClick={onSubmit}
                disabled={isSubmitting || !canCreate}
                className="atlas-button-primary"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Criar Empresa
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={isSubmitting}
                className="atlas-button-primary"
              >
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}