import { WebhookSubscription } from '../entities/WebhookSubscription';

export interface WebhookPayload {
  type: string;
  data: any;
  timestamp: string;
}

export interface IWebhookService {
  sendWebhook(subscription: WebhookSubscription, payload: WebhookPayload): Promise<void>;
  sendToUser(userId: string, payload: WebhookPayload): Promise<void>;
  sendToAllAdmins(payload: WebhookPayload): Promise<void>;
  broadcastToAll(payload: WebhookPayload): Promise<void>;
}