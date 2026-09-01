import nodemailer from 'nodemailer';
import { IEmailService, EmailOptions } from '../../domain/services/IEmailService';
import dotenv from 'dotenv';

dotenv.config();

export class NodemailerEmailService implements IEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT || '587');
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
      tls: {
        rejectUnauthorized: false
      }
    });

    if (!smtpUser || !smtpPass || !smtpFrom) {
      console.warn('⚠️ SMTP credentials are not configured. Email wil not send until SMTP_USER, SMTP_PASS and SMTP_FROM are set.');
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !smtpFrom) {
      throw new Error('SMTP credentials are not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM in the .env file.');
    }

    try {
      await this.transporter.sendMail({
        from: smtpFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      });
      console.log(`✅ Email sent to ${options.to}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendBudgetNotification(contactName: string, contactEmail: string): Promise<void> {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación de Contacto</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: #fff;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .content {
            padding: 30px;
          }
          .message {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .button {
            display: inline-block;
            padding: 10px 20px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Gracias por contactarnos!</h1>
          </div>
          <div class="content">
            <h2>Hola ${contactName},</h2>
            <p>Hemos recibido tu solicitud de presupuesto correctamente.</p>
            
            <div class="message">
              <strong>📋 Estado de tu solicitud:</strong>
              <p>Tu solicitud está siendo procesada y pronto recibirás tu presupuesto personalizado.</p>
            </div>
            
            <h3>¿Qué sucede ahora?</h3>
            <ul>
              <li>✅ Hemos registrado tus datos en nuestro sistema</li>
              <li>⏰ Un representante revisará tu solicitud</li>
              <li>📧 Recibirás tu presupuesto en las próximas 24-48 horas</li>
              <li>📞 Serás contactado a la brevedad posible</li>
            </ul>
            
            <p>Si tienes alguna pregunta urgente, no dudes en responder a este correo.</p>
            
            <center>
              <a href="mailto:${process.env.SMTP_FROM}" class="button">Contactar Soporte</a>
            </center>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Tu Empresa. Todos los derechos reservados.</p>
            <p>Este es un correo automático, por favor no respondas directamente.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: contactEmail,
      subject: 'Confirmación de Solicitud de Presupuesto',
      html: htmlContent
    });
  }
}