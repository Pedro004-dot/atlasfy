'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Heart, TrendingUp, TrendingDown } from 'lucide-react';

interface SentimentAnalysisData {
  overallScore: number;
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  satisfactionTrend: {
    current: number;
    previous: number;
    percentageChange: number;
    trend: string;
  };
  criticalAlerts: number;
}

interface SentimentAnalysisChartProps {
  data: SentimentAnalysisData | undefined;
}

const COLORS = [
  'oklch(0.8080 0.1140 19.5710)', // chart-1 (verde - positivo)
  'oklch(0.7040 0.1910 22.2160)', // chart-2 (cinza - neutro)
  'oklch(0.5770 0.2450 27.3250)'  // chart-4 (vermelho - negativo)
];

export function SentimentAnalysisChart({ data }: SentimentAnalysisChartProps) {
  if (!data) {
    return (
      <Card className="h-80 bg-gradient-to-br from-red-900/50 to-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Heart className="h-5 w-5 text-red-400" />
            Análise de Sentimento
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="h-16 w-16 bg-gradient-to-br from-pink-100 to-red-100 rounded-full flex items-center justify-center mx-auto">
                <Heart className="h-8 w-8 text-pink-400" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 bg-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">?</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-white">Análise de sentimento vazia</p>
              <p className="text-sm text-white max-w-xs">
                Os dados de sentimento aparecerão aqui quando houver conversas analisadas.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
              <div className="w-2 h-2 bg-pink-300 rounded-full"></div>
              <span>Aguardando análise de conversas</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Positivo', value: data.distribution.positive, color: COLORS[0] },
    { name: 'Neutro', value: data.distribution.neutral, color: COLORS[1] },
    { name: 'Negativo', value: data.distribution.negative, color: COLORS[2] }
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = chartData.reduce((sum, item) => sum + item.value, 0);
      const percentage = ((data.value / total) * 100).toFixed(1);
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-blue-600 font-medium">{data.value} conversas</p>
          <p className="text-gray-600">{percentage}% do total</p>
        </div>
      );
    }
    return null;
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-600';
    if (score >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4" />;
  };

  return (
    <Card className="h-80 bg-gradient-to-br from-red-900/50 to-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Heart className="h-5 w-5 text-red-400" />
          Análise de Sentimento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 h-64">
          {/* Gráfico de pizza */}
          <div className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Estatísticas */}
          <div className="space-y-4">
            <div className="text-center">
              <div className={cn("text-3xl font-bold mb-1", getScoreColor(data.overallScore))}>
                {(data.overallScore || 0).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Score Geral / 10</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tendência:</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(data.satisfactionTrend.trend)}
                  <span className={cn(
                    "font-medium",
                    data.satisfactionTrend.trend === 'up' ? 'text-green-600' : 
                    data.satisfactionTrend.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  )}>
                    {(data.satisfactionTrend.percentageChange || 0) > 0 ? '+' : ''}
                    {(data.satisfactionTrend.percentageChange || 0).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Alertas Críticos:</span>
                <span className="font-medium text-red-600">{data.criticalAlerts}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Positivo:</span>
                <span className="font-medium text-green-600">{data.distribution.positive}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Neutro:</span>
                <span className="font-medium text-gray-600">{data.distribution.neutral}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Negativo:</span>
                <span className="font-medium text-red-600">{data.distribution.negative}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
} 