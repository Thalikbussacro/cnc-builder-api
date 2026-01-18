import { Resend } from 'resend';
import { appConfig } from '../config';
import { logger } from '../utils/logger';

class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    this.resend = new Resend(appConfig.resendApiKey);
    this.fromEmail = `CNC Builder <${appConfig.fromEmail}>`;
  }

  /**
   * Envia email de verificação de conta
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `http://localhost:3000/verify-email?token=${token}`;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Verifique seu email - CNC Builder',
        text: `Bem-vindo ao CNC Builder!\n\nObrigado por se cadastrar. Para ativar sua conta, clique no link abaixo:\n\n${verificationUrl}\n\nEste link expira em 24 horas.\n\nSe você não criou esta conta, pode ignorar este email.\n\nCNC Builder - Gerador de G-code profissional`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .button {
                  display: inline-block;
                  padding: 12px 24px;
                  background-color: #0070f3;
                  color: white;
                  text-decoration: none;
                  border-radius: 6px;
                  margin: 20px 0;
                }
                .footer { margin-top: 30px; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Bem-vindo ao CNC Builder!</h1>
                <p>Obrigado por se cadastrar. Para ativar sua conta, clique no botão abaixo:</p>
                <a href="${verificationUrl}" class="button">Verificar Email</a>
                <p>Ou copie e cole este link no seu navegador:</p>
                <p style="word-break: break-all; color: #0070f3;">${verificationUrl}</p>
                <p>Este link expira em 24 horas.</p>
                <div class="footer">
                  <p>Se você não criou esta conta, pode ignorar este email.</p>
                  <p>CNC Builder - Gerador de G-code profissional</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      logger.info('Verification email sent', { email });
    } catch (error) {
      logger.error('Failed to send verification email', { email, error });
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Envia email de recuperação de senha
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `http://localhost:3000/reset-password?token=${token}`;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Recuperação de senha - CNC Builder',
        text: `Recuperação de Senha\n\nRecebemos uma solicitação para redefinir a senha da sua conta.\n\nClique no link abaixo para criar uma nova senha:\n\n${resetUrl}\n\nEste link expira em 1 hora.\n\nSe você não solicitou esta mudança, pode ignorar este email. Sua senha permanecerá inalterada.\n\nCNC Builder - Gerador de G-code profissional`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .button {
                  display: inline-block;
                  padding: 12px 24px;
                  background-color: #dc2626;
                  color: white;
                  text-decoration: none;
                  border-radius: 6px;
                  margin: 20px 0;
                }
                .footer { margin-top: 30px; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Recuperação de Senha</h1>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
                <p>Clique no botão abaixo para criar uma nova senha:</p>
                <a href="${resetUrl}" class="button">Redefinir Senha</a>
                <p>Ou copie e cole este link no seu navegador:</p>
                <p style="word-break: break-all; color: #dc2626;">${resetUrl}</p>
                <p>Este link expira em 1 hora.</p>
                <div class="footer">
                  <p>Se você não solicitou esta mudança, pode ignorar este email. Sua senha permanecerá inalterada.</p>
                  <p>CNC Builder - Gerador de G-code profissional</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      logger.info('Password reset email sent', { email });
    } catch (error) {
      logger.error('Failed to send password reset email', { email, error });
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Envia email de boas-vindas após verificação
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Bem-vindo ao CNC Builder!',
        text: `Olá, ${name}!\n\nSua conta foi verificada com sucesso. Bem-vindo ao CNC Builder!\n\nO que você pode fazer agora:\n- Configurar suas chapas e ferramentas\n- Cadastrar peças e usar nesting automático\n- Gerar código G-code otimizado para sua CNC\n- Visualizar preview 2D antes de cortar\n\nComece agora: http://localhost:3000/app\n\nPrecisa de ajuda? Entre em contato conosco.\n\nCNC Builder - Gerador de G-code profissional`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .feature { margin: 15px 0; }
                .footer { margin-top: 30px; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Olá, ${name}!</h1>
                <p>Sua conta foi verificada com sucesso. Bem-vindo ao CNC Builder!</p>

                <h2>O que você pode fazer agora:</h2>
                <div class="feature">
                  ✅ Configurar suas chapas e ferramentas
                </div>
                <div class="feature">
                  ✅ Cadastrar peças e usar nesting automático
                </div>
                <div class="feature">
                  ✅ Gerar código G-code otimizado para sua CNC
                </div>
                <div class="feature">
                  ✅ Visualizar preview 2D antes de cortar
                </div>

                <p>Comece agora: <a href="http://localhost:3000/app">Acessar aplicação</a></p>

                <div class="footer">
                  <p>Precisa de ajuda? Entre em contato conosco.</p>
                  <p>CNC Builder - Gerador de G-code profissional</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      logger.info('Welcome email sent', { email, name });
    } catch (error) {
      // Não lança erro pois email de boas-vindas não é crítico
      logger.warn('Failed to send welcome email', { email, name, error });
    }
  }
}

export const emailService = new EmailService();
