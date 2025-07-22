import { DashboardRepository, IDashboardRepository, DashboardOverview } from '@/repositories/dashboard.repository';

export interface IDashboardService {
  getOverview(empresaId: string): Promise<DashboardOverview | null>;
  getEmpresasByUsuario(usuarioId: string): Promise<string[]>;
}

export class DashboardService implements IDashboardService {
  constructor(private dashboardRepository: IDashboardRepository) {}

  async getOverview(empresaId: string): Promise<DashboardOverview | null> {
    return await this.dashboardRepository.getOverviewByEmpresa(empresaId);
  }

  async getEmpresasByUsuario(usuarioId: string): Promise<string[]> {
    return await this.dashboardRepository.getEmpresasByUsuario(usuarioId);
  }
}

export const dashboardService = new DashboardService(
  new DashboardRepository()
);