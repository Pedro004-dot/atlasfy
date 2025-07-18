'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ArrowRight, ArrowLeft, Plus, Edit, Trash2, X } from 'lucide-react';
import { ObjecaoFormData } from '@/lib/validations/empresa';

interface ObjectionsStepProps {
  data: ObjecaoFormData[];
  onNext: (data: ObjecaoFormData[]) => void;
  onPrevious: () => void;
}

interface ObjecaoFormState {
  tipo: string;
  mensagem_resposta: string;
  quando_usar: string;
  tags: string[];
  ativo: boolean;
}

const OBJECOES_SUGERIDAS = [
  {
    tipo: "Preço muito alto",
    mensagem_resposta: "Entendo sua preocupação com o investimento. Vamos conversar sobre o retorno que você terá? Em média, nossos clientes recuperam o investimento em 3 meses e aumentam suas vendas em 300%.",
    quando_usar: "Quando o cliente questiona o valor do produto/serviço",
    tags: ["preço", "custo", "investimento", "valor"]
  },
  {
    tipo: "Não tenho tempo agora",
    mensagem_resposta: "Compreendo que seu tempo é valioso. Que tal agendarmos apenas 15 minutos para eu mostrar como nossa solução pode economizar horas do seu dia a dia?",
    quando_usar: "Quando o cliente alega falta de tempo",
    tags: ["tempo", "agenda", "prioridade", "ocupado"]
  },
  {
    tipo: "Preciso pensar melhor",
    mensagem_resposta: "Claro! É uma decisão importante. Posso ajudá-lo com alguma informação específica para facilitar sua análise? Ou prefere que eu envie um material complementar?",
    quando_usar: "Quando o cliente hesita na decisão",
    tags: ["dúvida", "decisão", "hesitação", "análise"]
  }
];

export function ObjectionsStep({ data, onNext, onPrevious }: ObjectionsStepProps) {
  const [objecoes, setObjecoes] = useState<ObjecaoFormData[]>(data);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newObjecao, setNewObjecao] = useState<ObjecaoFormState>({
    tipo: '',
    mensagem_resposta: '',
    quando_usar: '',
    tags: [],
    ativo: true
  });
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (newTag.trim() && !newObjecao.tags.includes(newTag.trim())) {
      setNewObjecao(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewObjecao(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSaveObjecao = () => {
    if (newObjecao.tipo && newObjecao.mensagem_resposta && newObjecao.quando_usar) {
      if (editingIndex !== null) {
        // Editing existing
        const updatedObjecoes = [...objecoes];
        updatedObjecoes[editingIndex] = newObjecao as ObjecaoFormData;
        setObjecoes(updatedObjecoes);
        setEditingIndex(null);
      } else {
        // Adding new
        setObjecoes([...objecoes, newObjecao as ObjecaoFormData]);
      }
      
      setNewObjecao({
        tipo: '',
        mensagem_resposta: '',
        quando_usar: '',
        tags: [],
        ativo: true
      });
      setIsAddingNew(false);
    }
  };

  const handleEditObjecao = (index: number) => {
    setNewObjecao(objecoes[index]);
    setEditingIndex(index);
    setIsAddingNew(true);
  };

  const handleDeleteObjecao = (index: number) => {
    setObjecoes(objecoes.filter((_, i) => i !== index));
  };

  const handleUseSuggestion = (objecaoSugerida: any) => {
    setNewObjecao({
      ...objecaoSugerida,
      ativo: true
    });
    setIsAddingNew(true);
  };

  const handleCancel = () => {
    setNewObjecao({
      tipo: '',
      mensagem_resposta: '',
      quando_usar: '',
      tags: [],
      ativo: true
    });
    setIsAddingNew(false);
    setEditingIndex(null);
  };

  const handleNext = () => {
    onNext(objecoes);
  };

  const handleSkip = () => {
    onNext([]);
  };

  return (
    <div className="space-y-6">
      {/* Step Title */}
      <div className="text-center">
        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mx-auto mb-3" style={{ borderRadius: 'var(--radius)' }}>
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <h2 className="atlas-heading text-xl font-semibold text-foreground mb-1">
          Tratamento de Objeções
        </h2>
        <p className="atlas-muted text-sm">
          Configure respostas inteligentes para objeções comuns
        </p>
      </div>

      {/* Existing Objections */}
      {objecoes.length > 0 && (
        <div className="space-y-4">
          {objecoes.map((objecao, index) => (
            <div
              key={index}
              className="bg-muted p-4 border border-border"
              style={{ borderRadius: 'var(--radius)' }}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="atlas-heading font-medium text-foreground">
                  {objecao.tipo}
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditObjecao(index)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteObjecao(index)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Resposta:</span>
                  <p className="atlas-text mt-1">{objecao.mensagem_resposta}</p>
                </div>
                
                <div>
                  <span className="font-medium text-muted-foreground">Quando usar:</span>
                  <p className="atlas-text mt-1">{objecao.quando_usar}</p>
                </div>
                
                {objecao.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {objecao.tags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Objection Form */}
      {isAddingNew && (
        <div className="bg-muted p-6 border border-primary/20" style={{ borderRadius: 'var(--radius)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="atlas-heading font-semibold text-foreground">
              {editingIndex !== null ? 'Editar Objeção' : 'Nova Objeção'}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tipo" className="atlas-label">
                Tipo de Objeção *
              </Label>
              <Input
                id="tipo"
                value={newObjecao.tipo}
                onChange={(e) => setNewObjecao(prev => ({ ...prev, tipo: e.target.value }))}
                placeholder="Ex: Preço muito alto"
                className="atlas-input"
                style={{ borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mensagem_resposta" className="atlas-label">
                Mensagem de Resposta *
              </Label>
              <Textarea
                id="mensagem_resposta"
                value={newObjecao.mensagem_resposta}
                onChange={(e) => setNewObjecao(prev => ({ ...prev, mensagem_resposta: e.target.value }))}
                placeholder="Como o agente deve responder a esta objeção..."
                rows={3}
                className="atlas-input resize-none"
                style={{ borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quando_usar" className="atlas-label">
                Quando Usar *
              </Label>
              <Input
                id="quando_usar"
                value={newObjecao.quando_usar}
                onChange={(e) => setNewObjecao(prev => ({ ...prev, quando_usar: e.target.value }))}
                placeholder="Em que situação usar esta resposta..."
                className="atlas-input"
                style={{ borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags" className="atlas-label">
                Tags (palavras-chave)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Digite uma tag..."
                  className="atlas-input"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                />
                <Button
                  type="button"
                  onClick={handleAddTag}
                  variant="outline"
                  className="atlas-button-secondary"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {newObjecao.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {newObjecao.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-xs cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="atlas-button-secondary"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveObjecao}
                className="atlas-button-primary"
              >
                {editingIndex !== null ? 'Atualizar' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suggested Objections */}
      {!isAddingNew && objecoes.length < 5 && (
        <div className="bg-primary/5 border border-primary/20 p-4" style={{ borderRadius: 'var(--radius)' }}>
          <h3 className="atlas-heading font-medium text-primary mb-3">
            Objeções Sugeridas
          </h3>
          <div className="space-y-2">
            {OBJECOES_SUGERIDAS.map((sugestao, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-2 bg-card rounded border border-border"
              >
                <span className="text-sm font-medium text-foreground">
                  {sugestao.tipo}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUseSuggestion(sugestao)}
                  className="text-primary border-primary/30 hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Usar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Button */}
      {!isAddingNew && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setIsAddingNew(true)}
            className="atlas-button-secondary"
            style={{ borderRadius: 'var(--radius)' }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Objeção
          </Button>
        </div>
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
            Continuar
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}