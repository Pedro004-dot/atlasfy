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
import { WhatsAppStep } from './wizard-steps/whatsapp-step';
import { AdvancedConfigStep } from './wizard-steps/advanced-config-step';
import { StepIndicator } from './wizard-steps/step-indicator';

interface CreateCompanyWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyCreated: (company: Empresa) => void;
  canCreate?: boolean;
}

const STEPS = [
  { id: 1, name: 'Informações Básicas', icon: Building2 },
  { id: 2, name: 'Contato', icon: Building2 },
  { id: 3, name: 'Agente de Vendas', icon: Building2 },
  { id: 4, name: 'Objeções', icon: Building2 },
  { id: 5, name: 'Produtos', icon: Building2 },
  { id: 6, name: 'WhatsApp', icon: Building2 },
  { id: 7, name: 'Configurações Avançadas', icon: Building2 },
];

export function CreateCompanyWizard({ 
  isOpen, 
  onClose, 
  onCompanyCreated, 
  canCreate = true 
}: CreateCompanyWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(true); // Toggle for demonstration
  const { addToast } = useToast();

  // Form state for each step
  const [basicInfo, setBasicInfo] = useState<Partial<EmpresaBasicFormData>>({});
  const [contactInfo, setContactInfo] = useState<Partial<EmpresaContactFormData>>({});
  const [agenteConfig, setAgenteConfig] = useState<Partial<AgenteConfigFormData>>({});
  const [objecoes, setObjecoes] = useState<ObjecaoFormData[]>([]);
  const [produtos, setProdutos] = useState<ProdutoFormData[]>([]);
  const [whatsappConnection, setWhatsappConnection] = useState<WhatsAppConnectionFormData>({ connected: false });
  const [gatilhosEscalacao, setGatilhosEscalacao] = useState<Partial<GatilhoEscalacaoFormData>>({});
  const [followUps, setFollowUps] = useState<FollowUpFormData[]>([]);
  const [perguntasQualificacao, setPerguntasQualificacao] = useState<PerguntaQualificacaoFormData[]>([]);
  const [etapasFunil, setEtapasFunil] = useState<EtapaFunilFormData[]>([]);

  const reset = () => {
    setCurrentStep(1);
    setBasicInfo({});
    setContactInfo({});
    setAgenteConfig({});
    setObjecoes([]);
    setProdutos([]);
    setWhatsappConnection({ connected: false });
    setGatilhosEscalacao({});
    setFollowUps([]);
    setPerguntasQualificacao([]);
    setEtapasFunil([]);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= STEPS.length) {
      setCurrentStep(step);
    }
  };

  const handleStepComplete = (stepData: any) => {
    switch (currentStep) {
      case 1:
        setBasicInfo(stepData);
        break;
      case 2:
        setContactInfo(stepData);
        break;
      case 3:
        setAgenteConfig(stepData);
        break;
      case 4:
        setObjecoes(stepData);
        break;
      case 5:
        setProdutos(stepData);
        break;
      case 6:
        setWhatsappConnection(stepData);
        break;
      case 7:
        setGatilhosEscalacao(stepData.gatilhos_escalacao);
        setFollowUps(stepData.follow_ups);
        setPerguntasQualificacao(stepData.perguntas_qualificacao);
        setEtapasFunil(stepData.etapas_funil);
        break;
    }
    
    if (currentStep < STEPS.length) {
      handleNext();
    }
  };

  const handleSkipToNext = () => {
    // Save current data without validation in development mode
    if (isDevelopmentMode) {
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
        ...contactInfo,
        agente_config: Object.keys(agenteConfig).length > 0 ? agenteConfig as AgenteConfigFormData : undefined,
        objecoes: objecoes.length > 0 ? objecoes : undefined,
        produtos: produtos.length > 0 ? produtos : undefined,
        whatsapp_connection: whatsappConnection.connected ? whatsappConnection : undefined,
        gatilhos_escalacao: Object.keys(gatilhosEscalacao).length > 0 ? gatilhosEscalacao as GatilhoEscalacaoFormData : undefined,
        follow_ups: followUps.length > 0 ? followUps : undefined,
        perguntas_qualificacao: perguntasQualificacao.length > 0 ? perguntasQualificacao : undefined,
        etapas_funil: etapasFunil.length > 0 ? etapasFunil : undefined,
      };

      // Debug log para verificar formato do telefone
      console.log('=== CREATE COMPANY DEBUG ===');
      console.log('Contact Info:', contactInfo);
      console.log('Telefone final no formData:', formData.telefone);
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
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            data={basicInfo}
            onNext={handleStepComplete}
            onSkip={handleSkipToNext}
            isDevelopmentMode={isDevelopmentMode}
          />
        );
      case 2:
        return (
          <ContactInfoStep
            data={contactInfo}
            onNext={handleStepComplete}
            onPrevious={handlePrevious}
          />
        );
      case 3:
        return (
          <AgentConfigStep
            data={agenteConfig}
            onNext={handleStepComplete}
            onPrevious={handlePrevious}
          />
        );
      case 4:
        return (
          <ObjectionsStep
            data={objecoes}
            onNext={handleStepComplete}
            onPrevious={handlePrevious}
          />
        );
      case 5:
        return (
          <ProductsStep
            data={produtos.map(p => ({ ...p, imagens: p.imagens ?? [] }))}
            onNext={handleStepComplete}
            onPrevious={handlePrevious}
          />
        );
      case 6:
        return (
          <WhatsAppStep
            data={{
              ...whatsappConnection,
              profileName: whatsappConnection.profileName ?? undefined
            }}
            onNext={handleStepComplete}
            onPrevious={handlePrevious}
            empresaId={undefined} // Durante criação, não temos ID real ainda
            agentType={basicInfo.setor || "empresa"}
          />
        );
      case 7:
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
  };

  const isLastStep = currentStep === STEPS.length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalBody>
        <div className="space-y-6" style={{ fontFamily: 'var(--font-sans)', letterSpacing: 'var(--tracking-normal)' }}>
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 flex items-center justify-center mx-auto mb-4" style={{ borderRadius: 'var(--radius-lg)' }}>
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center justify-center gap-3 mb-2">
              <h1 className="atlas-heading text-2xl font-bold text-foreground">
                Criar Nova Empresa
              </h1>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDevelopmentMode(!isDevelopmentMode)}
                className={`text-xs h-6 px-2 ${isDevelopmentMode ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-green-100 text-green-800 border-green-300'}`}
              >
                {isDevelopmentMode ? '🔧 DEV' : '🔒 PROD'}
              </Button>
            </div>
            <p className="atlas-muted text-sm">
              Configure sua empresa e agente de vendas em {STEPS.length} etapas simples
              {isDevelopmentMode && (
                <span className="block text-yellow-600 text-xs mt-1">
                  ⚡ Modo Desenvolvimento: Navegue livremente | Clique nos steps | Validação desabilitada
                </span>
              )}
            </p>
          </div>

          {/* Step Indicator */}
          <StepIndicator
            steps={STEPS}
            currentStep={currentStep}
            onStepClick={goToStep}
            isDevelopmentMode={isDevelopmentMode}
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

          {/* Development Mode Navigation */}
          {isDevelopmentMode && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Dev Mode:</span>
              {currentStep < STEPS.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipToNext}
                  disabled={isSubmitting}
                  className="text-xs h-7 px-2"
                >
                  Pular Step
                </Button>
              )}
              <div className="flex border rounded" style={{ borderRadius: 'var(--radius-sm)' }}>
                {STEPS.map((step) => (
                  <Button
                    key={step.id}
                    variant={currentStep === step.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => goToStep(step.id)}
                    disabled={isSubmitting}
                    className="h-7 w-8 p-0 text-xs rounded-none first:rounded-l last:rounded-r"
                  >
                    {step.id}
                  </Button>
                ))}
              </div>
            </div>
          )}

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