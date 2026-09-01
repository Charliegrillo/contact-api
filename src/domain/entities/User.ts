export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'user';
}

export interface AuthenticateUserDTO {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
}