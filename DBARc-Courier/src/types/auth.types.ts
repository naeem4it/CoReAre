import { User } from './generated/user.types';

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  jwt: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  businessName?: string;
}

export interface RegisterResponse {
  jwt: string;
  user: User;
}

export interface AuthenticatedUser {
  jwt: string;
  user: User;
}

export interface JwtPayload {
  id: number;
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  businessName?: string;
}
