import { Notification, CreateNotificationDTO } from '../entities/Notification';

export interface INotificationRepository {
  create(notification: Notification): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByUserId(userId: string): Promise<Notification[]>;
  findUnreadByUserId(userId: string): Promise<Notification[]>;
  markAsRead(id: string): Promise<Notification>;
  markAllAsRead(userId: string): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAllByUserId(userId: string): Promise<void>;
}