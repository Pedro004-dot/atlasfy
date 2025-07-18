import nodemailer from 'nodemailer';
import { IEmailService } from '@/types/services';

export class EmailService implements IEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: parseInt(process.env.SMTP_PORT!),
      secure: false,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });
  }

  async sendVerificationEmail(email: string, token: string, nome: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER!,
      to: email,
      subject: 'Verifique seu email - Atlas Auth',
      html: this.getVerificationEmailTemplate(nome, token, email),
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Erro ao enviar email de verificação:', error);
      throw new Error('Erro ao enviar email de verificação');
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
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/home" class="button">Acessar Dashboard</a>
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
}

export const emailService = new EmailService();