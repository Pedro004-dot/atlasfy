import { createClient } from '@supabase/supabase-js';
import { IDatabaseService } from '@/types/services';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

console.log('SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey);
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey);

class DatabaseService implements IDatabaseService {
  private supabase;

  constructor() {
    // Tentar usar service role key primeiro, se falhar usar anon key
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }


  async query<T>(text: string, params?: any[]): Promise<T[]> {
    try {
      const { data, error } = await this.supabase.rpc('execute_sql', {
        query: text,
        parameters: params || []
      });

      if (error) {
        throw new Error(`Database query error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async queryOne<T>(text: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(text, params);
    return results.length > 0 ? results[0] : null;
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    return callback(this.supabase);
  }

  getClient() {
    return this.supabase;
  }
  
  // Método para testar conexão
  async testConnection() {
    try {
      const { data, error } = await this.supabase
        .from('usuario')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('Connection test failed:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Connection test error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const databaseService = new DatabaseService();