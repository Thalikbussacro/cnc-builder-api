export interface User {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  password?: string | null;
  email_verified?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationToken {
  id: string;
  token: string;
  user_id: string;
  type: 'email_verification' | 'password_reset';
  expires_at: string;
  created_at: string;
}

export interface AuthTokenPayload {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified?: string | null;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password?: string;
  image?: string;
}

export interface UpdateUserInput {
  name?: string;
  image?: string;
  password?: string;
  email_verified?: string;
}
