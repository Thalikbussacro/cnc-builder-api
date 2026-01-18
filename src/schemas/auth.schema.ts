import { z } from 'zod';

// Regex para validação de email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Regex para validação de senha forte
// Pelo menos 8 caracteres, 1 maiúscula, 1 minúscula, 1 número
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Schema para signup (cadastro)
 */
export const SignupSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .regex(emailRegex, 'Formato de email inválido')
    .toLowerCase()
    .trim(),
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(
      passwordRegex,
      'Senha deve conter pelo menos 1 maiúscula, 1 minúscula e 1 número'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

/**
 * Schema para login
 */
export const LoginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, 'Senha é obrigatória'),
});

/**
 * Schema para forgot password
 */
export const ForgotPasswordSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),
});

/**
 * Schema para reset password
 */
export const ResetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Token é obrigatório'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(
      passwordRegex,
      'Senha deve conter pelo menos 1 maiúscula, 1 minúscula e 1 número'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

/**
 * Schema para verify email
 */
export const VerifyEmailSchema = z.object({
  token: z.string()
    .min(1, 'Token é obrigatório'),
});

/**
 * Schema para Google OAuth
 */
export const GoogleAuthSchema = z.object({
  idToken: z.string()
    .min(1, 'Google ID token é obrigatório'),
});

// Export types
export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export type GoogleAuthInput = z.infer<typeof GoogleAuthSchema>;
