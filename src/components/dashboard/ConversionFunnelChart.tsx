'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ConversionFunnelData {
  stage: string;
  count: number;
  percentage: number;
  dropoffRate: number;
}

interface ConversionFunnelChartProps {
  data: ConversionFunnelData[];
}

const COLORS = [
  'oklch(0.8080 0.1140 19.5710)', // chart-1
  'oklch(0.7040 0.1910 22.2160)', // chart-2
  'oklch(0.6370 0.2370 25.3310)', // chart-3
  'oklch(0.5770 0.2450 27.3250)', // chart-4
  'oklch(0.5050 0.2130 27.5180)'  // chart-5
];

export function ConversionFunnelChart({ data }: ConversionFunnelChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="h-80 bg-gradient-to-br from-red-900/50 to-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="h-5 w-5 text-red-400" />
            Funil de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="h-16 w-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto">
                <TrendingUp className="h-8 w-8 text-purple-400" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">?</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-700">Funil de conversão vazio</p>
              <p className="text-sm text-gray-500 max-w-xs">
                Os dados do funil aparecerão aqui quando houver conversas com diferentes estágios de conversão.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
              <div className="w-2 h-2 bg-purple-300 rounded-full"></div>
              <span>Aguardando dados de conversão</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
    dropoff: (item.dropoffRate || 0) > 0 ? `+${(item.dropoffRate || 0).toFixed(1)}%` : `${(item.dropoffRate || 0).toFixed(1)}%`
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-blue-600 font-medium">{data.count} conversas</p>
          <p className="text-gray-600">{(data.percentage || 0).toFixed(1)}% do total</p>
          <p className={data.dropoffRate > 0 ? "text-red-600" : "text-green-600"}>
            Dropoff: {data.dropoff}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-80 bg-gradient-to-br from-red-900/50 to-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <TrendingUp className="h-5 w-5 text-red-400" />
          Funil de Conversão
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="horizontal" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              type="number" 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="stage" 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
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