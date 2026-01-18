import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { requireAuth } from '../middleware/auth.middleware';
import {
  SignupSchema,
  LoginSchema,
  VerifyEmailSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  GoogleAuthSchema,
} from '../schemas/auth.schema';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/auth/signup
 * Create new user account with email and password
 */
router.post('/auth/signup', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = SignupSchema.parse(req.body);

    // Call auth service
    const result = await authService.signup(
      validatedData.email,
      validatedData.name,
      validatedData.password
    );

    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Signup route error', { error: error.message });

      // Zod validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Validation error',
          details: error
        });
      }

      return res.status(400).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = LoginSchema.parse(req.body);

    // Call auth service
    const result = await authService.login(
      validatedData.email,
      validatedData.password
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Login route error', { error: error.message });

      // Zod validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Validation error',
          details: error
        });
      }

      return res.status(401).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email address with token
 */
router.post('/auth/verify-email', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = VerifyEmailSchema.parse(req.body);

    // Call auth service
    const result = await authService.verifyEmail(validatedData.token);

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Verify email route error', { error: error.message });

      // Zod validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Validation error',
          details: error
        });
      }

      return res.status(400).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = ForgotPasswordSchema.parse(req.body);

    // Call auth service
    const result = await authService.forgotPassword(validatedData.email);

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Forgot password route error', { error: error.message });

      // Zod validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Validation error',
          details: error
        });
      }

      return res.status(400).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = ResetPasswordSchema.parse(req.body);

    // Call auth service
    const result = await authService.resetPassword(
      validatedData.token,
      validatedData.password
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Reset password route error', { error: error.message });

      // Zod validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Validation error',
          details: error
        });
      }

      return res.status(400).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * POST /api/auth/google
 * Authenticate with Google OAuth
 */
router.post('/auth/google', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = GoogleAuthSchema.parse(req.body);

    // Call auth service
    const result = await authService.googleAuth(validatedData.idToken);

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Google auth route error', { error: error.message });

      // Zod validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Validation error',
          details: error
        });
      }

      return res.status(401).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * GET /api/auth/me
 * Get current user information (protected route)
 */
router.get('/auth/me', requireAuth, async (req: Request, res: Response) => {
  try {
    // User data is already attached to req.user by requireAuth middleware
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ user: req.user });
  } catch (error) {
    logger.error('Get current user route error', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
