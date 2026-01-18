import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { appConfig } from '../config';
import type { User, VerificationToken, CreateUserInput, UpdateUserInput } from '../types/auth.types';

class DatabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      appConfig.supabaseUrl,
      appConfig.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  // ===== USER OPERATIONS =====

  async createUser(input: CreateUserInput): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .insert({
        email: input.email.toLowerCase(),
        name: input.name,
        password: input.password || null,
        image: input.image || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found (acceptable)
      throw new Error(`Failed to get user by email: ${error.message}`);
    }

    return data;
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get user by ID: ${error.message}`);
    }

    return data;
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data;
  }

  async markEmailAsVerified(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({
        email_verified: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to mark email as verified: ${error.message}`);
    }
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({
        password: hashedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  // ===== VERIFICATION TOKEN OPERATIONS =====

  async createVerificationToken(
    userId: string,
    token: string,
    type: 'email_verification' | 'password_reset',
    expiresAt: Date
  ): Promise<VerificationToken | null> {
    const { data, error } = await this.supabase
      .from('verification_tokens')
      .insert({
        user_id: userId,
        token,
        type,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create verification token: ${error.message}`);
    }

    return data;
  }

  async getVerificationToken(token: string): Promise<VerificationToken | null> {
    const { data, error } = await this.supabase
      .from('verification_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get verification token: ${error.message}`);
    }

    return data;
  }

  async deleteVerificationToken(token: string): Promise<void> {
    const { error } = await this.supabase
      .from('verification_tokens')
      .delete()
      .eq('token', token);

    if (error) {
      throw new Error(`Failed to delete verification token: ${error.message}`);
    }
  }
}

export const databaseService = new DatabaseService();
