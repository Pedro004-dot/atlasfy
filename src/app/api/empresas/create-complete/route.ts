import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { createEmpresaSchema } from '@/lib/validations/empresa';
import { CreateEmpresaData } from '@/types/empresa';

// Database connection (assuming you have this configured)
async function executeQuery(query: string, params: any[] = []) {
  // This would be your actual database connection
  // For now, using the Supabase client
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.rpc('execute_sql_with_params', {
    sql_query: query,
    parameters: params
  });

  if (error) throw error;
  return data;
}

interface DecodedToken {
  userId: string;
  email: string;
  exp: number;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autenticação necessário' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decodedToken: DecodedToken;

    try {
      decodedToken = jwtDecode(token) as DecodedToken;
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Check token expiration
    if (Date.now() >= decodedToken.exp * 1000) {
      return NextResponse.json(
        { error: 'Token expirado' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    console.log('=== CREATE EMPRESA API ===');
    console.log('Request body:', JSON.stringify(body, null, 2));
    console.log('Agent type:', body.agent_type);
    console.log('Telefone provided:', body.telefone);
    
    const validationResult = createEmpresaSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const formData: CreateEmpresaData = validationResult.data;

    // Start transaction
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
      // 1. Create empresa
      // Handle telefone based on agent type - Sentinela doesn't require phone
      const telefoneValue = formData.telefone || (formData.agent_type === 'sentinela' ? 'N/A' : null);
      
      console.log('=== EMPRESA CREATION ===');
      console.log('Agent type:', formData.agent_type);
      console.log('Original telefone:', formData.telefone);
      console.log('Final telefone value:', telefoneValue);
      
      const { data: empresa, error: empresaError } = await supabase
        .from('empresa')
        .insert([{
          nome: formData.nome,
          cnpj: formData.cnpj || null,
          setor: formData.setor || null,
          descricao: formData.descricao || null,
          telefone: telefoneValue,
          email: formData.email || null,
          website: formData.website || null,
          endereco: formData.endereco || null,
          agent_type: formData.agent_type || 'vendas',
          ativo: true,
        }])
        .select()
        .single();

      if (empresaError) throw empresaError;

      const empresaId = empresa.id;

      // 2. Create usuario_empresa relationship
      const { error: userEmpresaError } = await supabase
        .from('usuario_empresa')
        .insert([{
          usuario_id: decodedToken.userId,
          empresa_id: empresaId,
          papel: 'proprietario',
          ativo: true,
        }]);

      if (userEmpresaError) throw userEmpresaError;

      // 3. Create agente_config if provided
      if (formData.agente_config && Object.keys(formData.agente_config).length > 0) {
        const { error: agenteError } = await supabase
          .from('agente_config')
          .insert([{
            empresa_id: empresaId,
            ...formData.agente_config,
          }]);

        if (agenteError) throw agenteError;
      }

      // 4. Create objecoes if provided
      if (formData.objecoes && formData.objecoes.length > 0) {
        const objecoesWithEmpresaId = formData.objecoes.map(objecao => ({
          empresa_id: empresaId,
          ...objecao,
        }));

        const { error: objecoesError } = await supabase
          .from('objecoes')
          .insert(objecoesWithEmpresaId);

        if (objecoesError) throw objecoesError;
      }

      // 5. Create produtos if provided
      if (formData.produtos && formData.produtos.length > 0) {
        const produtosWithEmpresaId = formData.produtos.map(produto => ({
          empresa_id: empresaId,
          nome: produto.nome,
          descricao: produto.descricao,
          preco: produto.preco || null,
          imagens: produto.imagens || [],
          ativo: produto.ativo !== undefined ? produto.ativo : true,
        }));

        const { error: produtosError } = await supabase
          .from('produto')
          .insert(produtosWithEmpresaId);

        if (produtosError) throw produtosError;
      }

      // 6. Create gatilhos_escalacao if provided
      if (formData.gatilhos_escalacao && Object.keys(formData.gatilhos_escalacao).length > 0) {
        const { error: gatilhosError } = await supabase
          .from('gatilhos_escalacao')
          .insert([{
            empresa_id: empresaId,
            ...formData.gatilhos_escalacao,
          }]);

        if (gatilhosError) throw gatilhosError;
      }

      // 7. Create follow_ups if provided
      if (formData.follow_ups && formData.follow_ups.length > 0) {
        const followUpsWithEmpresaId = formData.follow_ups.map(followUp => ({
          empresa_id: empresaId,
          ...followUp,
        }));

        const { error: followUpsError } = await supabase
          .from('follow_ups')
          .insert(followUpsWithEmpresaId);

        if (followUpsError) throw followUpsError;
      }

      // 8. Create perguntas_qualificacao if provided
      if (formData.perguntas_qualificacao && formData.perguntas_qualificacao.length > 0) {
        const perguntasWithEmpresaId = formData.perguntas_qualificacao.map(pergunta => ({
          empresa_id: empresaId,
          ...pergunta,
        }));

        const { error: perguntasError } = await supabase
          .from('perguntas_qualificacao')
          .insert(perguntasWithEmpresaId);

        if (perguntasError) throw perguntasError;
      }

      // 9. Create etapas_funil if provided
      if (formData.etapas_funil && formData.etapas_funil.length > 0) {
        const etapasWithEmpresaId = formData.etapas_funil.map(etapa => ({
          empresa_id: empresaId,
          ...etapa,
        }));

        const { error: etapasError } = await supabase
          .from('etapas_funil')
          .insert(etapasWithEmpresaId);

        if (etapasError) throw etapasError;
      }

      // 10. Create blocked numbers if provided
      if (formData.blocked_numbers && formData.blocked_numbers.length > 0) {
        const blockedNumbersWithEmpresaId = formData.blocked_numbers.map(numero => ({
          numero,
          empresa_id: empresaId,
          datehora: new Date().toISOString(),
          agente_ativo: false,
          ignorar_automacao: true
        }));

        const { error: blockedNumbersError } = await supabase
          .from('agent_control')
          .insert(blockedNumbersWithEmpresaId);

        if (blockedNumbersError) throw blockedNumbersError;
      }

      // Return success response
      return NextResponse.json({
        success: true,
        message: 'Empresa criada com sucesso',
        empresa: empresa
      });

    } catch (error: any) {
      console.error('Error creating empresa:', error);
      return NextResponse.json(
        { error: 'Erro ao criar empresa: ' + error.message },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}