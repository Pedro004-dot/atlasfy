'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, TrendingDown } from 'lucide-react';

interface LostLeadsData {
  reason: string;
  count: number;
  percentage: number;
  avgTicketValue: number;
}

interface LostLeadsChartProps {
  data: LostLeadsData[];
}

const COLORS = [
  'oklch(0.5770 0.2450 27.3250)', // chart-4 (vermelho)
  'oklch(0.6370 0.2370 25.3310)', // chart-3 (laranja)
  'oklch(0.7040 0.1910 22.2160)', // chart-2 (amarelo)
  'oklch(0.8080 0.1140 19.5710)', // chart-1 (verde)
  'oklch(0.5050 0.2130 27.5180)', // chart-5 (azul)
  'oklch(0.5770 0.2450 27.3250)', // chart-4 (roxo)
  'oklch(0.6370 0.2370 25.3310)', // chart-3 (rosa)
  'oklch(0.7040 0.1910 22.2160)'  // chart-2 (cinza)
];

export function LostLeadsChart({ data }: LostLeadsChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="h-80 bg-gradient-to-br from-red-900/50 to-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingDown className="h-5 w-5 text-red-400" />
            Análise de Leads Perdidos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="h-16 w-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <TrendingDown className="h-8 w-8 text-green-400" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-700">Excelente! Nenhum lead perdido</p>
              <p className="text-sm text-gray-500 max-w-xs">
                Todos os leads foram convertidos com sucesso. Continue com essa performance!
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs text-green-500">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Performance excepcional</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Agrupar dados por motivo e somar contagens
  const groupedData = data.reduce((acc, item) => {
    const existing = acc.find(d => d.reason === item.reason);
    if (existing) {
      existing.count += item.count;
      existing.avgTicketValue = (existing.avgTicketValue + item.avgTicketValue) / 2;
    } else {
      acc.push({ ...item });
    }
    return acc;
  }, [] as LostLeadsData[]);

  const chartData = groupedData
    .sort((a, b) => b.count - a.count)
    .slice(0, 8) // Top 8 motivos
    .map((item, index) => ({
      ...item,
      fill: COLORS[index % COLORS.length],
      reasonShort: item.reason.length > 20 ? item.reason.substring(0, 20) + '...' : item.reason
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.reason}</p>
          <p className="text-red-600 font-medium">{data.count} leads perdidos</p>
          <p className="text-gray-600">{(data.percentage || 0).toFixed(1)}% do total</p>
          <p className="text-gray-600">Ticket médio: R$ {(data.avgTicketValue || 0).toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-80 bg-gradient-to-br from-red-900/50 to-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <TrendingDown className="h-5 w-5 text-red-400" />
          Análise de Leads Perdidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis  
              dataKey="reasonShort" 
              tick={{ fontSize: 7, fill: "#f0f0f0", fontWeight: "bold" }}
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
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
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