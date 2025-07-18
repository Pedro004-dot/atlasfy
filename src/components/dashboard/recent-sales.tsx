"use client";

import React from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { UltimaVenda } from '@/types/dashboard';

interface RecentSalesProps {
  vendas: UltimaVenda[];
  isLoading?: boolean;
}

function SaleItem({ venda }: { venda: UltimaVenda }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {venda.cliente_nome}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(venda.created_at)}
        </p>
      </div>
      <div className="flex items-center space-x-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Pago
        </span>
        <p className="text-sm font-semibold text-foreground">
          {formatCurrency(venda.valor_total)}
        </p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="flex items-center justify-between py-4 animate-pulse">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-32"></div>
            <div className="h-3 bg-muted rounded w-20"></div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-6 bg-muted rounded-full w-12"></div>
            <div className="h-4 bg-muted rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecentSales({ vendas, isLoading }: RecentSalesProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          Últimas Vendas
        </h3>
        <span className="text-sm text-muted-foreground">
          {vendas.length} {vendas.length === 1 ? 'venda' : 'vendas'}
        </span>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : vendas.length > 0 ? (
        <div className="space-y-0">
          {vendas.map((venda) => (
            <SaleItem key={venda.id} venda={venda} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-muted-foreground mb-2">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">
            Nenhuma venda registrada hoje
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            As vendas aparecerão aqui quando os pedidos forem pagos
          </p>
        </div>
      )}
    </div>
  );
}