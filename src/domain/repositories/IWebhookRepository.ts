import { WebhookSubscription } from '../entities/WebhookSubscription';

export interface IWebhookRepository {
  create(subscription: WebhookSubscription): Promise<WebhookSubscription>;
  findById(id: string): Promise<WebhookSubscription | null>;
  findByUserId(userId: string): Promise<WebhookSubscription[]>;
  findByEndpoint(endpoint: string): Promise<WebhookSubscription | null>;
  findAllActive(): Promise<WebhookSubscription[]>;
  update(id: string, subscription: Partial<WebhookSubscription>): Promise<WebhookSubscription>;
  delete(id: string): Promise<void>;
  deactivate(id: string): Promise<void>;
}