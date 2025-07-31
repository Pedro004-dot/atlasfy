'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Shield, TrendingDown } from 'lucide-react';

interface PurchaseBarrierData {
  barrier: string;
  frequency: number;
  impact: string;
  affectedRevenue: number;
}

interface PurchaseBarriersChartProps {
  data: PurchaseBarrierData[];
}

const COLORS = [
  'oklch(0.5770 0.2450 27.3250)', // chart-4 (vermelho - alta prioridade)
  'oklch(0.6370 0.2370 25.3310)', // chart-3 (laranja - média prioridade)
  'oklch(0.7040 0.1910 22.2160)', // chart-2 (amarelo - baixa prioridade)
  'oklch(0.8080 0.1140 19.5710)', // chart-1 (verde - muito baixa)
  'oklch(0.5050 0.2130 27.5180)', // chart-5 (azul)
  'oklch(0.5770 0.2450 27.3250)', // chart-4 (roxo)
  'oklch(0.6370 0.2370 25.3310)', // chart-3 (rosa)
  'oklch(0.7040 0.1910 22.2160)'  // chart-2 (cinza)
];

export function PurchaseBarriersChart({ data }: PurchaseBarriersChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="h-80 bg-gradient-to-br from-red-900/50 to-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5 text-red-400" />
            Barreiras de Compra
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="h-16 w-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-green-400" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-700">Excelente! Nenhuma barreira identificada</p>
              <p className="text-sm text-gray-500 max-w-xs">
                Não há obstáculos significativos impedindo as vendas. Continue com essa performance!
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs text-green-500">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Processo de venda otimizado</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data
    .sort((a, b) => b.affectedRevenue - a.affectedRevenue)
    .slice(0, 10) // Top 10 barreiras
    .map((item, index) => ({
      ...item,
      fill: COLORS[index % COLORS.length],
      barrierShort: item.barrier.length > 25 ? item.barrier.substring(0, 25) + '...' : item.barrier,
      revenueFormatted: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(item.affectedRevenue)
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.barrier}</p>
          <p className="text-red-600 font-medium">{data.frequency} ocorrências</p>
          <p className="text-orange-600 font-medium">Impacto: {data.impact}</p>
          <p className="text-gray-600">Receita afetada: {data.revenueFormatted}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-80 bg-gradient-to-br from-red-900/50 to-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Shield className="h-5 w-5 text-red-400" />
          Barreiras de Compra
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="barrierShort" 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="frequency" name="Frequência" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
} 