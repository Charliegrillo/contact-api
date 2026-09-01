export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  budget: number;
  company?: string;
  status: 'pending' | 'contacted' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContactDTO {
  name: string;
  email: string;
  phone: string;
  message: string;
  budget: number;
  company?: string;
}