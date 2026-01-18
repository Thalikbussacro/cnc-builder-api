import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { UpdatePreferencesSchema } from '../schemas/preferences.schema';
import { databaseService } from '../services/database.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/preferences
 * Get user's preferences
 */
router.get('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: preferences, error } = await databaseService['supabase']
      .from('user_preferences')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    // PGRST116 = not found (first time user)
    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching preferences', { error, userId: req.user.id });
      return res.status(500).json({ error: 'Failed to fetch preferences' });
    }

    return res.status(200).json({ preferences: preferences || null });
  } catch (error) {
    logger.error('Error in GET /api/preferences', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/preferences
 * Create or update user preferences (upsert)
 */
router.put('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate input
    const validatedData = UpdatePreferencesSchema.parse(req.body);

    // Upsert preferences
    const { data: preferences, error } = await databaseService['supabase']
      .from('user_preferences')
      .upsert({
        user_id: req.user.id,
        ...validatedData,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error updating preferences', { error, userId: req.user.id });
      return res.status(500).json({ error: 'Failed to update preferences' });
    }

    logger.info('Preferences updated successfully', { userId: req.user.id });

    return res.status(200).json({ preferences });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error
      });
    }

    logger.error('Error in PUT /api/preferences', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
