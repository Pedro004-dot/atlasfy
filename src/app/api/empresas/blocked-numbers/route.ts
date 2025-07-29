import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { databaseService } from '@/lib/database';

const JWT_SECRET = process.env.JWT_SECRET!;

interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

async function validateToken(request: NextRequest): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Token não fornecido' };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    return { success: true, userId: decoded.userId };
  } catch (error) {
    return { success: false, error: 'Token inválido' };
  }
}

function validatePhoneNumber(number: string): string | null {
  if (!number) return 'Número é obrigatório';
  if (!/^\d+$/.test(number)) return 'Apenas números são permitidos';
  if (number.length !== 12) return 'Número deve ter exatamente 12 dígitos (formato: 553196997292 - sem o 9 adicional)';
  if (!number.startsWith('55')) return 'Número deve começar com código do país 55';
  
  const ddd = number.substring(2, 4);
  
  if (!/^[1-9][0-9]$/.test(ddd)) return 'DDD inválido (deve ser entre 11 e 99)';
  
  // Verificar se o número tem 8 dígitos após o DDD (sem o 9 adicional)
  const phoneNumber = number.substring(4);
  if (phoneNumber.length !== 8) return 'Número deve ter 8 dígitos após o DDD (sem o 9 adicional)';
  if (!/^\d{8}$/.test(phoneNumber)) return 'Número deve conter apenas dígitos';
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Validar token
    const authResult = await validateToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { blocked_numbers, empresa_id } = body;

    // Validação básica
    if (!empresa_id) {
      return NextResponse.json(
        { success: false, message: 'ID da empresa é obrigatório' },
        { status: 400 }
      );
    }

    if (!Array.isArray(blocked_numbers)) {
      return NextResponse.json(
        { success: false, message: 'Lista de números bloqueados deve ser um array' },
        { status: 400 }
      );
    }

    // Validar cada número
    const validationErrors: string[] = [];
    blocked_numbers.forEach((number, index) => {
      const error = validatePhoneNumber(number);
      if (error) {
        validationErrors.push(`Número ${index + 1}: ${error}`);
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Números inválidos encontrados',
          errors: validationErrors
        },
        { status: 400 }
      );
    }

    const supabase = databaseService.getClient();

    // Verificar se o usuário tem acesso à empresa
    const { data: userEmpresa, error: empresaError } = await supabase
      .from('usuario_empresa')
      .select('empresa_id')
      .eq('usuario_id', authResult.userId)
      .eq('empresa_id', empresa_id)
      .single();

    if (empresaError || !userEmpresa) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado à empresa' },
        { status: 403 }
      );
    }

    // Remover números bloqueados existentes para esta empresa
    // (assumindo que queremos substituir todos os números)
    const { error: removeError } = await supabase
      .from('agent_control')
      .delete()
      .eq('empresa_id', empresa_id)
      .eq('ignorar_automacao', true);

    if (removeError) {
      console.error('Erro ao remover números bloqueados existentes:', removeError);
    }

    // Inserir novos números bloqueados
    if (blocked_numbers.length > 0) {
      const numbersToInsert = blocked_numbers.map(numero => ({
        numero,
        empresa_id,
        datehora: new Date().toISOString(),
        agente_ativo: false,
        ignorar_automacao: true
      }));

      const { data: insertedNumbers, error: insertError } = await supabase
        .from('agent_control')
        .insert(numbersToInsert)
        .select();

      if (insertError) {
        console.error('Erro ao inserir números bloqueados:', insertError);
        return NextResponse.json(
          { success: false, message: 'Erro ao salvar números bloqueados' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: insertedNumbers,
        message: `${blocked_numbers.length} números bloqueados salvos com sucesso`
      });
    }

    return NextResponse.json({
      success: true,
      data: [],
      message: 'Lista de números bloqueados atualizada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro na API de números bloqueados:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validar token
    const authResult = await validateToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const empresa_id = searchParams.get('empresa_id');

    if (!empresa_id) {
      return NextResponse.json(
        { success: false, message: 'ID da empresa é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = databaseService.getClient();

    // Verificar se o usuário tem acesso à empresa
    const { data: userEmpresa, error: empresaError } = await supabase
      .from('usuario_empresa')
      .select('empresa_id')
      .eq('usuario_id', authResult.userId)
      .eq('empresa_id', empresa_id)
      .single();

    if (empresaError || !userEmpresa) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado à empresa' },
        { status: 403 }
      );
    }

    // Buscar números bloqueados
    const { data: blockedNumbers, error } = await supabase
      .from('agent_control')
      .select('numero, datehora')
      .eq('empresa_id', empresa_id)
      .eq('ignorar_automacao', true)
      .order('datehora', { ascending: false });

    if (error) {
      console.error('Erro ao buscar números bloqueados:', error);
      return NextResponse.json(
        { success: false, message: 'Erro ao carregar números bloqueados' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: blockedNumbers || [],
      message: 'Números bloqueados carregados com sucesso'
    });

  } catch (error: any) {
    console.error('Erro na API de números bloqueados:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Validar token
    const authResult = await validateToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { numero, empresa_id } = body;

    if (!numero || !empresa_id) {
      return NextResponse.json(
        { success: false, message: 'Número e ID da empresa são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = databaseService.getClient();

    // Verificar se o usuário tem acesso à empresa
    const { data: userEmpresa, error: empresaError } = await supabase
      .from('usuario_empresa')
      .select('empresa_id')
      .eq('usuario_id', authResult.userId)
      .eq('empresa_id', empresa_id)
      .single();

    if (empresaError || !userEmpresa) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado à empresa' },
        { status: 403 }
      );
    }

    // Remover número específico
    const { error: deleteError } = await supabase
      .from('agent_control')
      .delete()
      .eq('numero', numero)
      .eq('empresa_id', empresa_id)
      .eq('ignorar_automacao', true);

    if (deleteError) {
      console.error('Erro ao remover número bloqueado:', deleteError);
      return NextResponse.json(
        { success: false, message: 'Erro ao remover número bloqueado' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Número removido da lista de bloqueados com sucesso'
    });

  } catch (error: any) {
    console.error('Erro na API de remoção de número bloqueado:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}