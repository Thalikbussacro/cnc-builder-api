import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  CreatePresetSchema,
  UpdatePresetSchema,
  GetPresetsQuerySchema,
} from '../schemas/presets.schema';
import { databaseService } from '../services/database.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/presets
 * List user's configuration presets with optional filtering
 */
router.get('/presets', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate query parameters
    const query = GetPresetsQuerySchema.parse({
      favorites: req.query.favorites as string | undefined,
    });

    const favorites = query.favorites === 'true';

    // Build Supabase query
    let supabaseQuery = databaseService['supabase']
      .from('config_presets')
      .select('*')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false });

    if (favorites) {
      supabaseQuery = supabaseQuery.eq('is_favorite', true);
    }

    const { data: presets, error } = await supabaseQuery;

    if (error) {
      logger.error('Error fetching presets', { error, userId: req.user.id });
      return res.status(500).json({ error: 'Failed to fetch presets' });
    }

    return res.status(200).json({ presets: presets || [] });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error
      });
    }

    logger.error('Error in GET /api/presets', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/presets/:id
 * Get a specific preset by ID
 */
router.get('/presets/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const { data: preset, error } = await databaseService['supabase']
      .from('config_presets')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !preset) {
      logger.warn('Preset not found', { presetId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Preset not found' });
    }

    return res.status(200).json({ preset });
  } catch (error) {
    logger.error('Error in GET /api/presets/:id', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/presets
 * Create a new configuration preset
 */
router.post('/presets', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate input
    const validatedData = CreatePresetSchema.parse(req.body);

    // Insert preset
    const { data: preset, error } = await databaseService['supabase']
      .from('config_presets')
      .insert({
        user_id: req.user.id,
        name: validatedData.name,
        description: validatedData.description || null,
        config_chapa: validatedData.config_chapa,
        config_corte: validatedData.config_corte,
        config_ferramenta: validatedData.config_ferramenta,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating preset', { error, userId: req.user.id });
      return res.status(500).json({ error: 'Failed to create preset' });
    }

    logger.info('Preset created successfully', { presetId: preset.id, userId: req.user.id });

    return res.status(201).json({ preset });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error
      });
    }

    logger.error('Error in POST /api/presets', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/presets/:id
 * Update an existing preset
 */
router.patch('/presets/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Validate input
    const validatedData = UpdatePresetSchema.parse(req.body);

    // Update preset
    const { data: preset, error } = await databaseService['supabase']
      .from('config_presets')
      .update(validatedData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !preset) {
      logger.warn('Preset not found for update', { presetId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Preset not found' });
    }

    logger.info('Preset updated successfully', { presetId: id, userId: req.user.id });

    return res.status(200).json({ preset });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error
      });
    }

    logger.error('Error in PATCH /api/presets/:id', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/presets/:id
 * Delete a preset
 */
router.delete('/presets/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Delete preset
    const { error } = await databaseService['supabase']
      .from('config_presets')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      logger.error('Error deleting preset', { error, presetId: id, userId: req.user.id });
      return res.status(500).json({ error: 'Failed to delete preset' });
    }

    logger.info('Preset deleted successfully', { presetId: id, userId: req.user.id });

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/presets/:id', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
