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
        try {
            const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';
            const mailOptions = {
                from: {
                    name: process.env.SMTP_FROM_NAME || 'Contact API',
                    address: fromAddress
                },
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
                // ✅ Headers adicionales para evitar spam
                headers: {
                    'X-Priority': '1',
                    'X-Mailer': 'Contact API',
                    'Reply-To': fromAddress
                }
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email sent to ${options.to}`);
        } catch (error) {
            console.error(`❌ Error enviando email a ${options.to}:`, error);
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

    /**
     * Email de notificación al administrador
     */
    async sendAdminNotification(contactData: {
        name: string;
        email: string;
        phone: string;
        message: string;
        budget: number;
        company?: string;
        createdAt: Date;
    }): Promise<void> {
        const adminEmail = process.env.ADMIN_EMAIL || 'charliegrillo@gmail.com';
        const htmlContent = this.generateAdminEmailTemplate(contactData);
        
        await this.sendEmail({
            to: adminEmail,
            subject: `🔔 Nuevo contacto: ${contactData.name} - Presupuesto $${contactData.budget}`,
            html: htmlContent
        });
    }

    /**
     * Template para el administrador
     */
    private generateAdminEmailTemplate(contactData: {
        name: string;
        email: string;
        phone: string;
        message: string;
        budget: number;
        company?: string;
        createdAt: Date;
    }): string {
        return `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Nuevo Contacto</title>
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
                        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                    }
                    .content {
                        padding: 30px;
                    }
                    .detail-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                    }
                    .detail-table th, .detail-table td {
                        padding: 12px;
                        text-align: left;
                        border-bottom: 1px solid #ddd;
                    }
                    .detail-table th {
                        background: #f8f9fa;
                        font-weight: bold;
                    }
                    .budget-highlight {
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                        font-size: 1.2em;
                        font-weight: bold;
                    }
                    .message-box {
                        background: #f8f9fa;
                        border-left: 4px solid #f5576c;
                        padding: 15px;
                        margin: 20px 0;
                    }
                    .actions {
                        margin: 20px 0;
                        text-align: center;
                    }
                    .button {
                        display: inline-block;
                        padding: 10px 20px;
                        background: #f5576c;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 5px;
                    }
                    .button-secondary {
                        background: #667eea;
                    }
                    .footer {
                        background: #f8f9fa;
                        padding: 20px;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔔 Nuevo Contacto Recibido</h1>
                    </div>
                    <div class="content">
                        <h2>Detalles del Contacto</h2>
                        
                        <div class="budget-highlight">
                            💰 Presupuesto Solicitado: $${contactData.budget.toLocaleString()}
                        </div>
                        
                        <table class="detail-table">
                            <tr>
                                <th>Campo</th>
                                <th>Valor</th>
                            </tr>
                            <tr>
                                <td><strong>Nombre</strong></td>
                                <td>${contactData.name}</td>
                            </tr>
                            <tr>
                                <td><strong>Email</strong></td>
                                <td><a href="mailto:${contactData.email}">${contactData.email}</a></td>
                            </tr>
                            <tr>
                                <td><strong>Teléfono</strong></td>
                                <td><a href="tel:${contactData.phone}">${contactData.phone}</a></td>
                            </tr>
                            ${contactData.company ? `
                            <tr>
                                <td><strong>Empresa</strong></td>
                                <td>${contactData.company}</td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td><strong>Fecha</strong></td>
                                <td>${contactData.createdAt.toLocaleString('es-ES')}</td>
                            </tr>
                        </table>
                        
                        <div class="message-box">
                            <strong>📝 Mensaje del Cliente:</strong>
                            <p>${contactData.message}</p>
                        </div>
                        
                        <div class="actions">
                            <a href="mailto:${contactData.email}" class="button">Responder por Email</a>
                            <a href="tel:${contactData.phone}" class="button button-secondary">Llamar por Teléfono</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Tu Empresa - Sistema de Contactos</p>
                        <p>Este es un correo automático del sistema.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
}