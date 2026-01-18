import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { appConfig } from '../config';
import { databaseService } from './database.service';
import { emailService } from './email.service';
import { logger } from '../utils/logger';
import type { User } from '../types/auth.types';

class AuthService {
  /**
   * Generates a JWT token for a user
   */
  private generateToken(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: user.email_verified,
    };

    return jwt.sign(payload, appConfig.jwtSecret, {
      expiresIn: appConfig.jwtExpiresIn,
    } as jwt.SignOptions);
  }

  /**
   * User signup with email and password
   */
  async signup(email: string, name: string, password: string): Promise<{ message: string }> {
    try {
      // Check if user already exists
      const existingUser = await databaseService.getUserByEmail(email);
      if (existingUser) {
        throw new Error('Email já cadastrado');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await databaseService.createUser({
        email,
        name,
        password: hashedPassword,
      });

      if (!user) {
        throw new Error('Erro ao criar usuário');
      }

      // Generate verification token (valid for 24 hours)
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await databaseService.createVerificationToken(
        user.id,
        token,
        'email_verification',
        expiresAt
      );

      // Send verification email
      await emailService.sendVerificationEmail(user.email, token);

      logger.info('User signed up successfully', { userId: user.id, email: user.email });

      return { message: 'Verification email sent. Please check your inbox.' };
    } catch (error) {
      logger.error('Signup error', { error, email });
      throw error;
    }
  }

  /**
   * User login with email and password
   */
  async login(email: string, password: string): Promise<{ token: string; user: Omit<User, 'password'> }> {
    try {
      // Get user by email
      const user = await databaseService.getUserByEmail(email);
      if (!user) {
        throw new Error('Credenciais inválidas');
      }

      // Check if email is verified
      if (!user.email_verified) {
        throw new Error('Email não verificado. Por favor, verifique seu email antes de fazer login.');
      }

      // Check if user has password (not OAuth-only user)
      if (!user.password) {
        throw new Error('Esta conta usa login social. Por favor, use o botão "Continuar com Google".');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Credenciais inválidas');
      }

      // Generate JWT
      const token = this.generateToken(user);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      return { token, user: userWithoutPassword };
    } catch (error) {
      logger.error('Login error', { error, email });
      throw error;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ token: string; user: Omit<User, 'password'> }> {
    try {
      // Get verification token from database
      const verificationToken = await databaseService.getVerificationToken(token);
      if (!verificationToken) {
        throw new Error('Token inválido ou expirado');
      }

      // Check if token has expired
      if (new Date() > new Date(verificationToken.expires_at)) {
        await databaseService.deleteVerificationToken(token);
        throw new Error('Token expirado. Por favor, solicite um novo email de verificação.');
      }

      // Check if token type is correct
      if (verificationToken.type !== 'email_verification') {
        throw new Error('Token inválido');
      }

      // Mark email as verified
      await databaseService.markEmailAsVerified(verificationToken.user_id);

      // Delete verification token
      await databaseService.deleteVerificationToken(token);

      // Get updated user
      const user = await databaseService.getUserById(verificationToken.user_id);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Generate JWT for auto-login
      const jwtToken = this.generateToken(user);

      // Send welcome email
      await emailService.sendWelcomeEmail(user.email, user.name);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      logger.info('Email verified successfully', { userId: user.id, email: user.email });

      return { token: jwtToken, user: userWithoutPassword };
    } catch (error) {
      logger.error('Email verification error', { error, token });
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      // Get user by email
      const user = await databaseService.getUserByEmail(email);

      // Always return success message to prevent user enumeration
      if (!user) {
        logger.warn('Password reset requested for non-existent email', { email });
        return { message: 'If an account with this email exists, a password reset link has been sent.' };
      }

      // Check if user has a password (not OAuth-only)
      if (!user.password) {
        logger.warn('Password reset requested for OAuth-only user', { email });
        return { message: 'If an account with this email exists, a password reset link has been sent.' };
      }

      // Generate reset token (valid for 1 hour)
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await databaseService.createVerificationToken(
        user.id,
        token,
        'password_reset',
        expiresAt
      );

      // Send password reset email
      await emailService.sendPasswordResetEmail(user.email, token);

      logger.info('Password reset email sent', { userId: user.id, email: user.email });

      return { message: 'If an account with this email exists, a password reset link has been sent.' };
    } catch (error) {
      logger.error('Forgot password error', { error, email });
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      // Get verification token from database
      const verificationToken = await databaseService.getVerificationToken(token);
      if (!verificationToken) {
        throw new Error('Token inválido ou expirado');
      }

      // Check if token has expired
      if (new Date() > new Date(verificationToken.expires_at)) {
        await databaseService.deleteVerificationToken(token);
        throw new Error('Token expirado. Por favor, solicite um novo link de recuperação.');
      }

      // Check if token type is correct
      if (verificationToken.type !== 'password_reset') {
        throw new Error('Token inválido');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await databaseService.updatePassword(verificationToken.user_id, hashedPassword);

      // Delete reset token
      await databaseService.deleteVerificationToken(token);

      logger.info('Password reset successfully', { userId: verificationToken.user_id });

      return { message: 'Password updated successfully. You can now login with your new password.' };
    } catch (error) {
      logger.error('Reset password error', { error, token });
      throw error;
    }
  }

  /**
   * Google OAuth authentication
   */
  async googleAuth(googleIdToken: string): Promise<{ token: string; user: Omit<User, 'password'> }> {
    try {
      // Verify Google ID token
      // Note: In production, you should verify the token with Google's API
      // For now, we'll use a library like 'google-auth-library'
      const { OAuth2Client } = require('google-auth-library');
      const client = new OAuth2Client(appConfig.googleClientId);

      const ticket = await client.verifyIdToken({
        idToken: googleIdToken,
        audience: appConfig.googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error('Invalid Google token');
      }

      const { email, name, picture } = payload;

      // Check if user exists
      let user = await databaseService.getUserByEmail(email);

      if (!user) {
        // Create new user with verified email
        user = await databaseService.createUser({
          email,
          name: name || email.split('@')[0],
          image: picture,
        });

        if (!user) {
          throw new Error('Erro ao criar usuário');
        }

        // Mark email as verified immediately for OAuth users
        await databaseService.markEmailAsVerified(user.id);

        // Refetch user to get updated email_verified timestamp
        user = await databaseService.getUserById(user.id);
        if (!user) {
          throw new Error('Erro ao buscar usuário');
        }

        // Send welcome email
        await emailService.sendWelcomeEmail(user.email, user.name);

        logger.info('New user created via Google OAuth', { userId: user.id, email: user.email });
      } else {
        // Update existing user's name and image if provided
        const updates: { name?: string; image?: string } = {};
        if (name && name !== user.name) updates.name = name;
        if (picture && picture !== user.image) updates.image = picture;

        if (Object.keys(updates).length > 0) {
          user = await databaseService.updateUser(user.id, updates);
          if (!user) {
            throw new Error('Erro ao atualizar usuário');
          }
        }

        logger.info('User logged in via Google OAuth', { userId: user.id, email: user.email });
      }

      // Generate JWT
      const jwtToken = this.generateToken(user);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      return { token: jwtToken, user: userWithoutPassword };
    } catch (error) {
      logger.error('Google auth error', { error });
      throw error;
    }
  }
}

export const authService = new AuthService();
