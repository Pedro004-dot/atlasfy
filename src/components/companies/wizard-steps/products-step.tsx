'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/ui/image-upload';
import { Package, ArrowRight, ArrowLeft, Plus, Edit, Trash2, X, DollarSign, Archive } from 'lucide-react';

interface ProdutoFormData {
  nome: string;
  descricao: string;
  preco?: number;
  estoque?: number;
  imagens: string[];
  ativo: boolean;
}

interface ProductsStepProps {
  data: ProdutoFormData[];
  onNext: (data: ProdutoFormData[]) => void;
  onPrevious: () => void;
}

interface ProdutoFormState {
  nome: string;
  descricao: string;
  preco?: number;
  estoque?: number;
  imagens: string[];
  ativo: boolean;
}

const PRODUTOS_SUGERIDOS = [
  {
    nome: "Consultoria Estratégica",
    descricao: "Consultoria especializada em estratégia de negócios e crescimento empresarial",
    preco: 2500,
    estoque: 10,
    imagens: [],
    ativo: true
  },
  {
    nome: "Desenvolvimento de Software",
    descricao: "Desenvolvimento de aplicações web e mobile personalizadas",
    preco: 15000,
    estoque: 5,
    imagens: [],
    ativo: true
  },
  {
    nome: "Marketing Digital",
    descricao: "Pacote completo de marketing digital e gestão de redes sociais",
    preco: 3500,
    estoque: 20,
    imagens: [],
    ativo: true
  }
];

export function ProductsStep({ data, onNext, onPrevious }: ProductsStepProps) {
  const [produtos, setProdutos] = useState<ProdutoFormData[]>(data);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newProduto, setNewProduto] = useState<ProdutoFormState>({
    nome: '',
    descricao: '',
    preco: undefined,
    estoque: undefined,
    imagens: [],
    ativo: true
  });


  const handleSaveProduto = () => {
    if (newProduto.nome && newProduto.descricao) {
      if (editingIndex !== null) {
        // Editing existing
        const updatedProdutos = [...produtos];
        updatedProdutos[editingIndex] = newProduto as ProdutoFormData;
        setProdutos(updatedProdutos);
        setEditingIndex(null);
      } else {
        // Adding new
        setProdutos([...produtos, newProduto as ProdutoFormData]);
      }
      
      setNewProduto({
        nome: '',
        descricao: '',
        preco: undefined,
        estoque: undefined,
        imagens: [],
        ativo: true
      });
      setIsAddingNew(false);
    }
  };

  const handleEditProduto = (index: number) => {
    setNewProduto(produtos[index]);
    setEditingIndex(index);
    setIsAddingNew(true);
  };

  const handleDeleteProduto = (index: number) => {
    setProdutos(produtos.filter((_, i) => i !== index));
  };


  const handleCancel = () => {
    setNewProduto({
      nome: '',
      descricao: '',
      preco: undefined,
      estoque: undefined,
      imagens: [],
      ativo: true
    });
    setIsAddingNew(false);
    setEditingIndex(null);
  };

  const handleNext = () => {
    onNext(produtos);
  };

  const handleSkip = () => {
    onNext([]);
  };

  return (
    <div className="space-y-6">
      {/* Step Title */}
      <div className="text-center">
        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mx-auto mb-3" style={{ borderRadius: 'var(--radius)' }}>
          <Package className="h-6 w-6 text-primary" />
        </div>
        <h2 className="atlas-heading text-xl font-semibold text-foreground mb-1">
          Produtos e Serviços
        </h2>
        <p className="atlas-muted text-sm">
          Configure os produtos ou serviços que sua empresa oferece
        </p>
      </div>

      {/* Existing Products */}
      {produtos.length > 0 && (
        <div className="space-y-4">
          <h3 className="atlas-heading text-lg font-semibold text-foreground border-b border-border pb-2">
            Produtos Cadastrados
          </h3>
          
          {produtos.map((produto, index) => (
            <div
              key={index}
              className="bg-muted p-6 border border-border"
              style={{ borderRadius: 'var(--radius)' }}
            >
              {/* Header com Nome e Ações */}
              <div className="flex justify-between items-start mb-4">
                <h4 className="atlas-heading text-lg font-medium text-foreground flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {produto.nome}
                </h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditProduto(index)}
                    className="h-8 w-8 p-0"
                    title="Editar produto"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProduto(index)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    title="Excluir produto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Informações do Produto - Layout Vertical Alinhado à Esquerda */}
              <div className="space-y-3">
                {/* Descrição */}
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Descrição:</span>
                  <p className="atlas-text mt-1 text-foreground">{produto.descricao}</p>
                </div>

                {/* Preço e Estoque - Linha Horizontal */}
                <div className="flex gap-6">
                  {produto.preco && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Valor:</span>
                      <Badge variant="outline" className="text-green-600 bg-green-50">
                        <DollarSign className="h-3 w-3 mr-1" />
                        R$ {produto.preco.toLocaleString()}
                      </Badge>
                    </div>
                  )}
                  
                  {produto.estoque !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Estoque:</span>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                        <Archive className="h-3 w-3 mr-1" />
                        {produto.estoque} unidades
                      </Badge>
                    </div>
                  )}
                </div>


                {/* Imagens */}
                {produto.imagens.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">🖼️ Imagens:</span>
                    <div className="flex gap-2 mt-2">
                      {produto.imagens.slice(0, 4).map((image, imgIndex) => (
                        <div
                          key={imgIndex}
                          className="w-16 h-16 rounded border border-border overflow-hidden"
                          style={{ borderRadius: 'var(--radius-sm)' }}
                        >
                          <img
                            src={image}
                            alt={`${produto.nome} ${imgIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {produto.imagens.length > 4 && (
                        <div className="w-16 h-16 rounded border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          +{produto.imagens.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Product Form */}
      {isAddingNew && (
        <div className="bg-muted p-6 border border-primary/20" style={{ borderRadius: 'var(--radius)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="atlas-heading font-semibold text-foreground">
              {editingIndex !== null ? 'Editar Produto' : 'Novo Produto'}
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
          
          <div className="space-y-6">
            {/* Informações Básicas */}
            <div className="bg-background p-4 border border-border" style={{ borderRadius: 'var(--radius)' }}>
              <h4 className="atlas-heading font-medium text-foreground mb-4 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Informações Básicas
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="atlas-label">
                    Nome do Produto *
                  </Label>
                  <Input
                    id="nome"
                    value={newProduto.nome}
                    onChange={(e) => setNewProduto(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: iPhone 15 Pro"
                    className="atlas-input"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preco" className="atlas-label">
                    Preço (R$)
                  </Label>
                  <Input
                    id="preco"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProduto.preco || ''}
                    onChange={(e) => setNewProduto(prev => ({ ...prev, preco: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    placeholder="Ex: 2500.00"
                    className="atlas-input"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="descricao" className="atlas-label">
                  Descrição *
                </Label>
                <Textarea
                  id="descricao"
                  value={newProduto.descricao}
                  onChange={(e) => setNewProduto(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva seu produto ou serviço..."
                  rows={3}
                  className="atlas-input resize-none"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="estoque" className="atlas-label">
                  Estoque
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="estoque"
                    type="number"
                    min="0"
                    value={newProduto.estoque || ''}
                    onChange={(e) => setNewProduto(prev => ({ ...prev, estoque: e.target.value ? parseInt(e.target.value) : undefined }))}
                    placeholder="50"
                    className="atlas-input max-w-32"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  />
                  <span className="text-sm text-muted-foreground">unidades</span>
                </div>
              </div>
            </div>

            {/* Upload de Imagens */}
            <div className="bg-background p-4 border border-border" style={{ borderRadius: 'var(--radius)' }}>
              <h4 className="atlas-heading font-medium text-foreground mb-4 flex items-center gap-2">
                📸 Imagens do Produto
              </h4>
              
              <ImageUpload
                images={newProduto.imagens}
                onImagesChange={(images) => setNewProduto(prev => ({ ...prev, imagens: images }))}
                maxImages={5}
                maxSizePerImage={5}
                acceptedFormats={['image/jpeg', 'image/png', 'image/webp']}
                companyId="company-preview" // Will be replaced with real ID when product is saved
                productId={editingIndex !== null ? `product-${editingIndex}` : `product-${Date.now()}`}
                useRealUpload={true} // ✅ Supabase storage configured and ready
              />
              
              <p className="text-xs text-muted-foreground mt-2">
                💡 Formatos aceitos: JPG, PNG, WEBP (máx. 5MB cada)
              </p>
            </div>


            {/* Botões de Ação */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="atlas-button-secondary"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveProduto}
                className="atlas-button-primary"
              >
                {editingIndex !== null ? 'Atualizar' : 'Adicionar'}
              </Button>
            </div>
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
            Novo Produto
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