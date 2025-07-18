import { DashboardRepository, IDashboardRepository } from '@/repositories/dashboard.repository';
import { DashboardData, DashboardMetrics, UltimaVenda } from '@/types/dashboard';

export interface IDashboardService {
  getDashboardData(usuarioId: string): Promise<DashboardData>;
  getEmpresasByUsuario(usuarioId: string): Promise<string[]>;
}

export class DashboardService implements IDashboardService {
  constructor(
    private dashboardRepository: IDashboardRepository
  ) {}

  async getDashboardData(usuarioId: string): Promise<DashboardData> {
    try {
      // Buscar empresas do usuário
      const empresaIds = await this.dashboardRepository.getEmpresasByUsuario(usuarioId);
      
      if (empresaIds.length === 0) {
        return {
          metrics: {
            vendasHoje: 0,
            leadsHoje: 0,
            taxaConversao: 0,
            carrinhoAbandonado: 0,
          },
          ultimasVendas: [],
        };
      }

      // Por enquanto, vamos usar a primeira empresa
      // TODO: Implementar seleção de empresa ou agregação de múltiplas empresas
      const empresaId = empresaIds[0];

      // Buscar métricas e últimas vendas em paralelo
      const [metrics, ultimasVendas] = await Promise.all([
        this.dashboardRepository.getMetricsByEmpresa(empresaId),
        this.dashboardRepository.getUltimasVendasByEmpresa(empresaId),
      ]);

      return {
        metrics,
        ultimasVendas,
      };
    } catch (error) {
      console.error('Erro no DashboardService.getDashboardData:', error);
      throw new Error('Erro ao buscar dados do dashboard');
    }
  }

  async getEmpresasByUsuario(usuarioId: string): Promise<string[]> {
    try {
      return await this.dashboardRepository.getEmpresasByUsuario(usuarioId);
    } catch (error) {
      console.error('Erro no DashboardService.getEmpresasByUsuario:', error);
      throw new Error('Erro ao buscar empresas do usuário');
    }
  }
}

export const dashboardService = new DashboardService(
  new DashboardRepository()
);