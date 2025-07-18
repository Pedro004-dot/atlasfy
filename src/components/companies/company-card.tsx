'use client';

import React from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Users, 
  Calendar, 
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empresa } from '@/types';

interface CompanyCardProps {
  company: Empresa;
  onEdit?: (company: Empresa) => void;
  onDelete?: (company: Empresa) => void;
  onCardClick?: (company: Empresa) => void;
}

export function CompanyCard({ company, onEdit, onDelete, onCardClick }: CompanyCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  return (
    <Card 
      className={`atlas-card p-6 hover:shadow-atlas-lg transition-all duration-200 border-l-4 border-l-primary ${
        onCardClick ? 'cursor-pointer hover:scale-[1.02]' : ''
      }`}
      style={{ 
        fontFamily: 'var(--font-sans)', 
        letterSpacing: 'var(--tracking-normal)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)'
      }}
      onClick={(e) => {
        // Não ativar o clique do card se clicou nos botões
        if (!(e.target as HTMLElement).closest('button') && onCardClick) {
          onCardClick(company);
        }
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-14 h-14 bg-primary/10 flex items-center justify-center"
            style={{ borderRadius: 'var(--radius-lg)' }}
          >
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="atlas-heading font-bold text-foreground text-lg">{company.nome}</h3>
            <p className="atlas-muted text-sm">
              {company.setor || 'Setor não informado'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant={company.ativo ? "default" : "secondary"}
            className={company.ativo ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"}
            style={{ 
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-sans)',
              letterSpacing: 'var(--tracking-normal)'
            }}
          >
            {company.ativo ? 'Ativa' : 'Inativa'}
          </Badge>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {company.descricao && (
        <p className="atlas-text text-sm text-muted-foreground mb-4 line-clamp-2">
          {company.descricao}
        </p>
      )}

      <div className="space-y-3 mb-4">
        {company.cnpj && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="atlas-text">CNPJ: {formatCNPJ(company.cnpj)}</span>
          </div>
        )}

        {company.endereco && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="atlas-text truncate">{company.endereco}</span>
          </div>
        )}

        {company.telefone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span className="atlas-text">{company.telefone}</span>
          </div>
        )}

        {company.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span className="atlas-text truncate">{company.email}</span>
          </div>
        )}

        {company.website && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <a 
              href={company.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 flex items-center gap-1 atlas-text"
            >
              <span className="truncate">Website</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="atlas-text">Criada em {formatDate(company.created_at)}</span>
        </div>
      </div>

      {/* Estatísticas */}
      {company._count && (
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="atlas-text">{company._count.usuarios} usuários</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="atlas-text">{company._count.agentes} agentes</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(company)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                  title="Editar empresa"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(company)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                  title="Excluir empresa"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}