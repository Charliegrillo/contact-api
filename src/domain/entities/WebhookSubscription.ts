export interface WebhookSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  deviceType?: string;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface CreateWebhookSubscriptionDTO {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  deviceType?: string;
}