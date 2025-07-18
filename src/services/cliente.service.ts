import { clienteRepository, IClienteRepository } from '@/repositories/cliente.repository';
import { Cliente, ClienteWithEmpresa, ClienteFilters, ClienteListResponse } from '@/types';

export interface IClienteService {
  getClientesByEmpresa(empresaId: string, filters?: ClienteFilters): Promise<ClienteListResponse>;
  getClienteById(id: string): Promise<ClienteWithEmpresa | null>;
  createCliente(data: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>): Promise<Cliente>;
  updateCliente(id: string, data: Partial<Cliente>): Promise<Cliente>;
  deleteCliente(id: string): Promise<void>;
  sendWhatsAppMessage(telefone: string, mensagem: string): Promise<boolean>;
}

export class ClienteService implements IClienteService {
  constructor(private clienteRepository: IClienteRepository) {}

  async getClientesByEmpresa(empresaId: string, filters: ClienteFilters = {}): Promise<ClienteListResponse> {
    try {
      // Validate empresaId
      if (!empresaId) {
        throw new Error('ID da empresa é obrigatório');
      }

      // Set default filters
      const defaultFilters: ClienteFilters = {
        page: 1,
        limit: 10,
        orderBy: 'recent',
        ...filters,
      };

      // Validate pagination parameters
      if (defaultFilters.page! < 1) {
        defaultFilters.page = 1;
      }

      if (defaultFilters.limit! < 1 || defaultFilters.limit! > 100) {
        defaultFilters.limit = 10;
      }

      const result = await this.clienteRepository.getClientesByEmpresa(empresaId, defaultFilters);
      
      // Format dates for display
      result.clientes = result.clientes.map(cliente => ({
        ...cliente,
        cliente_empresa: {
          ...cliente.cliente_empresa,
          primeiro_contato: this.formatDate(cliente.cliente_empresa.primeiro_contato),
          ultimo_contato: cliente.cliente_empresa.ultimo_contato 
            ? this.formatDate(cliente.cliente_empresa.ultimo_contato)
            : undefined,
        }
      }));

      return result;
    } catch (error) {
      throw new Error(`Erro ao buscar clientes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async getClienteById(id: string): Promise<ClienteWithEmpresa | null> {
    try {
      if (!id) {
        throw new Error('ID do cliente é obrigatório');
      }

      const cliente = await this.clienteRepository.getClienteById(id);
      
      if (cliente) {
        // Format dates for display
        cliente.cliente_empresa.primeiro_contato = this.formatDate(cliente.cliente_empresa.primeiro_contato);
        if (cliente.cliente_empresa.ultimo_contato) {
          cliente.cliente_empresa.ultimo_contato = this.formatDate(cliente.cliente_empresa.ultimo_contato);
        }
      }

      return cliente;
    } catch (error) {
      throw new Error(`Erro ao buscar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async createCliente(data: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>): Promise<Cliente> {
    try {
      // Validate required fields
      if (!data.nome && !data.telefone) {
        throw new Error('Nome ou telefone é obrigatório');
      }

      // Validate phone number format if provided
      if (data.telefone && !this.isValidPhone(data.telefone)) {
        throw new Error('Formato de telefone inválido');
      }

      return await this.clienteRepository.createCliente(data);
    } catch (error) {
      throw new Error(`Erro ao criar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async updateCliente(id: string, data: Partial<Cliente>): Promise<Cliente> {
    try {
      if (!id) {
        throw new Error('ID do cliente é obrigatório');
      }

      // Validate phone number format if provided
      if (data.telefone && !this.isValidPhone(data.telefone)) {
        throw new Error('Formato de telefone inválido');
      }

      return await this.clienteRepository.updateCliente(id, data);
    } catch (error) {
      throw new Error(`Erro ao atualizar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async deleteCliente(id: string): Promise<void> {
    try {
      if (!id) {
        throw new Error('ID do cliente é obrigatório');
      }

      await this.clienteRepository.deleteCliente(id);
    } catch (error) {
      throw new Error(`Erro ao deletar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async sendWhatsAppMessage(telefone: string, mensagem: string): Promise<boolean> {
    try {
      if (!telefone) {
        throw new Error('Número de telefone é obrigatório');
      }

      if (!mensagem) {
        throw new Error('Mensagem é obrigatória');
      }

      // Validate phone number format
      if (!this.isValidPhone(telefone)) {
        throw new Error('Formato de telefone inválido');
      }

      // Format phone number for WhatsApp
      const formattedPhone = this.formatPhoneForWhatsApp(telefone);

      // Create WhatsApp web URL
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(mensagem)}`;
      
      // Open WhatsApp in a new window
      if (typeof window !== 'undefined') {
        window.open(whatsappUrl, '_blank');
        return true;
      }

      return false;
    } catch (error) {
      throw new Error(`Erro ao enviar mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  private isValidPhone(phone: string): boolean {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Brazilian phone number validation
    // Should have 10 or 11 digits (with area code)
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
  }

  private formatPhoneForWhatsApp(phone: string): string {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Add Brazil country code if not present
    if (!cleanPhone.startsWith('55')) {
      return `55${cleanPhone}`;
    }
    
    return cleanPhone;
  }
}

export const clienteService = new ClienteService(clienteRepository);