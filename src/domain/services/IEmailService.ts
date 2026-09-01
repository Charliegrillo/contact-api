export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IEmailService {
  sendEmail(options: EmailOptions): Promise<void>;
  sendBudgetNotification(contactName: string, contactEmail: string): Promise<void>;
}