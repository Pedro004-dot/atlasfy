import nodemailer from 'nodemailer';
import { IEmailService } from '@/types/services';

export class EmailService implements IEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Limpar e validar variáveis de ambiente
    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpPort = process.env.SMTP_PORT?.trim();
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
    
    
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      throw new Error('Configuração SMTP incompleta');
    }
    
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  async sendVerificationEmail(email: string, token: string, nome: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER?.trim()!,
      to: email,
      subject: 'Verifique seu email - Atlas Auth',
      html: this.getVerificationEmailTemplate(nome, token, email),
    };

    try {
      console.log('Enviando email de verificação para:', email);
      await this.transporter.sendMail(mailOptions);
      console.log('Email de verificação enviado com sucesso');
    } catch (error) {
      console.error('Erro detalhado ao enviar email de verificação:', error);
      throw new Error(`Erro ao enviar email de verificação: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendPasswordResetEmail(email: string, token: string, nome: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER!,
      to: email,
      subject: 'Redefinir sua senha - Atlas Auth',
      html: this.getPasswordResetEmailTemplate(nome, token, email),
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Erro ao enviar email de reset de senha:', error);
      throw new Error('Erro ao enviar email de reset de senha');
    }
  }

  async sendWelcomeEmail(email: string, nome: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER!,
      to: email,
      subject: 'Bem-vindo ao Atlas Auth!',
      html: this.getWelcomeEmailTemplate(nome),
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Erro ao enviar email de boas-vindas:', error);
    }
  }

  async sendBankingAccountCreatedEmail(email: string, nome: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER!,
      to: email,
      subject: 'Conta Bancária Criada - Verificação Necessária',
      html: this.getBankingAccountCreatedEmailTemplate(nome),
    };

    try {
      console.log('Enviando email de conta bancária criada para:', email);
      await this.transporter.sendMail(mailOptions);
      console.log('Email de conta bancária criada enviado com sucesso');
    } catch (error) {
      console.error('Erro ao enviar email de conta bancária criada:', error);
      throw new Error(`Erro ao enviar email de conta bancária criada: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getVerificationEmailTemplate(nome: string, token: string, email: string): string {
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/confirmar-email?email=${encodeURIComponent(email)}&token=${token}`;
    
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificação de Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .token { font-size: 24px; font-weight: bold; color: #3b82f6; text-align: center; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; }
          .footer { text-align: center; margin-top: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Atlas Auth</h1>
            <p>Verificação de Email</p>
          </div>
          <div class="content">
            <h2>Olá, ${nome}!</h2>
            <p>Obrigado por se cadastrar no Atlas Auth. Para ativar sua conta, utilize o código abaixo:</p>
            <div class="token">${token}</div>
            <p>Ou clique no botão abaixo para verificar automaticamente:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verificar Email</a>
            </p>
            <p><strong>Este código expira em 15 minutos.</strong></p>
            <p>Se você não solicitou este cadastro, ignore este email.</p>
          </div>
          <div class="footer">
            <p>© 2024 Atlas Auth. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetEmailTemplate(nome: string, token: string, email: string): string {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/esqueci-senha?email=${encodeURIComponent(email)}&token=${token}`;
    
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redefinir Senha</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .token { font-size: 24px; font-weight: bold; color: #3b82f6; text-align: center; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; }
          .footer { text-align: center; margin-top: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Atlas Auth</h1>
            <p>Redefinição de Senha</p>
          </div>
          <div class="content">
            <h2>Olá, ${nome}!</h2>
            <p>Você solicitou a redefinição de sua senha. Utilize o código abaixo para continuar:</p>
            <div class="token">${token}</div>
            <p>Ou clique no botão abaixo para redefinir automaticamente:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Redefinir Senha</a>
            </p>
            <p><strong>Este código expira em 15 minutos.</strong></p>
            <p>Se você não solicitou esta redefinição, ignore este email e sua senha permanecerá inalterada.</p>
          </div>
          <div class="footer">
            <p>© 2024 Atlas Auth. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getWelcomeEmailTemplate(nome: string): string {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vindo ao Atlas Auth</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; }
          .footer { text-align: center; margin-top: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Atlas Auth</h1>
            <p>Bem-vindo!</p>
          </div>
          <div class="content">
            <h2>Olá, ${nome}!</h2>
            <p>Sua conta foi verificada com sucesso! Bem-vindo ao Atlas Auth.</p>
            <p>Você agora tem acesso completo à plataforma e pode começar a usar todos os recursos disponíveis.</p>
            <p><strong>Período de teste gratuito:</strong> Você tem 7 dias gratuitos para explorar todas as funcionalidades.</p>
            <p style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/" class="button">Acessar Dashboard</a>
            </p>
            <p>Se você tiver alguma dúvida ou precisar de ajuda, não hesite em entrar em contato conosco.</p>
          </div>
          <div class="footer">
            <p>© 2024 Atlas Auth. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getBankingAccountCreatedEmailTemplate(nome: string): string {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Conta Bancária Criada - Verificação Necessária</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .alert { background: #fef3c7; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .steps { background: #e0f2fe; padding: 20px; border-radius: 4px; margin: 20px 0; }
          .step { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
          .footer { text-align: center; margin-top: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏦 Atlas Auth</h1>
            <p>Conta Bancária Criada com Sucesso</p>
          </div>
          <div class="content">
            <h2>Olá, ${nome}!</h2>
            <p>Sua conta bancária foi criada com sucesso no sistema Asaas! 🎉</p>
            
            <div class="alert">
              <strong>⚠️ IMPORTANTE:</strong> Para ativar completamente sua conta bancária e começar a receber pagamentos, você deve concluir o processo de verificação no Asaas.
            </div>

            <div class="steps">
              <h3>📋 Próximos Passos:</h3>
              <div class="step">
                <strong>1.</strong> Verifique sua caixa de entrada de email (incluindo spam/lixo eletrônico)
              </div>
              <div class="step">
                <strong>2.</strong> Procure por emails da Asaas com instruções de verificação
              </div>
              <div class="step">
                <strong>3.</strong> Siga as instruções para enviar os documentos necessários
              </div>
              <div class="step">
                <strong>4.</strong> Aguarde a aprovação (normalmente 1-2 dias úteis)
              </div>
            </div>

            <p><strong>Documentos que podem ser solicitados:</strong></p>
            <ul>
              <li>Documento de identidade (RG ou CNH)</li>
              <li>Comprovante de endereço</li>
              <li>Comprovante de renda (se aplicável)</li>
              <li>Documentos da empresa (para CNPJ)</li>
            </ul>

            <p><strong>Sua conta bancária estará pronta para uso assim que a verificação for concluída!</strong></p>
            
            <p>Se você não receber o email do Asaas em até 30 minutos, verifique:</p>
            <ul>
              <li>Pasta de spam/lixo eletrônico</li>
              <li>Se o email está correto no seu cadastro</li>
              <li>Entre em contato com nosso suporte se necessário</li>
            </ul>
          </div>
          <div class="footer">
            <p>© 2024 Atlas Auth. Todos os direitos reservados.</p>
            <p>Em caso de dúvidas, entre em contato conosco.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();