export interface Notification {
  id: string;
  userId: string;
  contactId: string;
  title: string;
  message: string;
  type: 'new_contact' | 'status_change' | 'system';
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

export interface CreateNotificationDTO {
  userId: string;
  contactId: string;
  title: string;
  message: string;
  type: 'new_contact' | 'status_change' | 'system';
}