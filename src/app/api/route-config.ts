// Configuração global para rotas da API
export const apiRouteConfig = {
  dynamic: 'force-dynamic',
  runtime: 'nodejs',
  revalidate: 0
} as const;

// Função para aplicar configurações padrão
export function applyApiRouteConfig() {
  return {
    dynamic: 'force-dynamic',
    runtime: 'nodejs',
    revalidate: 0
  };
} 