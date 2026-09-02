/**
 * Opciones para enviar un email
 */
export interface EmailOptions {
    /** Dirección de email del destinatario */
    to: string;
    
    /** Asunto del email */
    subject: string;
    
    /** Contenido HTML del email */
    html: string;
    
    /** Contenido en texto plano (opcional, para clientes que no soportan HTML) */
    text?: string;
    
    /** Dirección de email del remitente (opcional, usa SMTP_FROM por defecto) */
    from?: string;
    
    /** Nombre del remitente (opcional) */
    fromName?: string;
    
    /** Dirección para responder (opcional) */
    replyTo?: string;
    
    /** Adjuntos (opcional) */
    attachments?: Array<{
        filename: string;
        content: string | Buffer;
        contentType?: string;
    }>;
    
    /** Headers adicionales (opcional) */
    headers?: Record<string, string>;
}

/**
 * Interfaz del servicio de email
 */
export interface IEmailService {
    /**
     * Enviar un email genérico
     */
    sendEmail(options: EmailOptions): Promise<void>;
    
    /**
     * Enviar email de confirmación al visitante
     */
    sendBudgetNotification(contactName: string, contactEmail: string): Promise<void>;
    
    /**
     * Enviar email de notificación al administrador
     */
    sendAdminNotification(contactData: {
        name: string;
        email: string;
        phone: string;
        message: string;
        budget: number;
        company?: string;
        createdAt: Date;
    }): Promise<void>;
}