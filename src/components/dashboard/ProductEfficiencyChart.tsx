'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Package, TrendingUp } from 'lucide-react';

interface ProductEfficiencyData {
  productName: string;
  conversionRate: number;
  totalSales: number;
}

interface ProductEfficiencyChartProps {
  data: ProductEfficiencyData[];
}

const COLORS = [
  'oklch(0.8080 0.1140 19.5710)', // chart-1 (azul)
  'oklch(0.7040 0.1910 22.2160)', // chart-2 (roxo)
  'oklch(0.6370 0.2370 25.3310)', // chart-3 (rosa)
  'oklch(0.5770 0.2450 27.3250)', // chart-4 (laranja)
  'oklch(0.5050 0.2130 27.5180)', // chart-5 (verde)
  'oklch(0.8080 0.1140 19.5710)', // chart-1 (vermelho)
  'oklch(0.7040 0.1910 22.2160)', // chart-2 (ciano)
  'oklch(0.6370 0.2370 25.3310)'  // chart-3 (verde claro)
];

export function ProductEfficiencyChart({ data }: ProductEfficiencyChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="h-80 bg-gradient-to-br from-red-900/50 to-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Package className="h-5 w-5 text-red-400" />
            Eficiência por Produto
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="h-16 w-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto">
                <Package className="h-8 w-8 text-blue-400" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">?</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-700">Nenhum produto analisado</p>
              <p className="text-sm text-gray-500 max-w-xs">
                Os dados de eficiência por produto aparecerão aqui quando houver conversas com produtos mencionados.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
              <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
              <span>Aguardando dados de conversas</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 10) // Top 10 produtos
    .map((item, index) => ({
      ...item,
      fill: COLORS[index % COLORS.length],
      productShort: item.productName.length > 15 ? item.productName.substring(0, 15) + '...' : item.productName
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.productName}</p>
          <p className="text-blue-600 font-medium">{(data.conversionRate || 0).toFixed(1)}% conversão</p>
          <p className="text-green-600 font-medium">R$ {(data.totalSales || 0).toFixed(2)} vendas</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-80 bg-gradient-to-br from-red-900/50 to-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Package className="h-5 w-5 text-red-400" />
          Eficiência por Produto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="productShort" 
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
            <Legend />
            <Bar dataKey="conversionRate" name="Taxa de Conversão (%)" radius={[4, 4, 0, 0]}>
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