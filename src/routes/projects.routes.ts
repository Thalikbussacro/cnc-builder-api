import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  GetProjectsQuerySchema,
} from '../schemas/projects.schema';
import { databaseService } from '../services/database.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/projects
 * List user's projects with optional filtering
 */
router.get('/projects', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate query parameters
    const query = GetProjectsQuerySchema.parse({
      limit: req.query.limit as string | undefined,
      offset: req.query.offset as string | undefined,
      favorites: req.query.favorites as string | undefined,
    });

    const limit = query.limit || 50;
    const offset = query.offset || 0;
    const favorites = query.favorites === 'true';

    // Build Supabase query
    let supabaseQuery = databaseService['supabase']
      .from('projects')
      .select('*')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (favorites) {
      supabaseQuery = supabaseQuery.eq('is_favorite', true);
    }

    const { data: projects, error } = await supabaseQuery;

    if (error) {
      logger.error('Error fetching projects', { error, userId: req.user.id });
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }

    return res.status(200).json({ projects: projects || [] });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error
      });
    }

    logger.error('Error in GET /api/projects', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/projects/:id
 * Get a specific project by ID
 */
router.get('/projects/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const { data: project, error } = await databaseService['supabase']
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !project) {
      logger.warn('Project not found', { projectId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Project not found' });
    }

    // Update last_opened_at
    await databaseService['supabase']
      .from('projects')
      .update({ last_opened_at: new Date().toISOString() })
      .eq('id', id);

    return res.status(200).json({ project });
  } catch (error) {
    logger.error('Error in GET /api/projects/:id', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/projects', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate input
    const validatedData = CreateProjectSchema.parse(req.body);

    // Insert project
    const { data: project, error } = await databaseService['supabase']
      .from('projects')
      .insert({
        user_id: req.user.id,
        name: validatedData.name,
        description: validatedData.description || null,
        config_chapa: validatedData.config_chapa,
        config_corte: validatedData.config_corte,
        config_ferramenta: validatedData.config_ferramenta,
        metodo_nesting: validatedData.metodo_nesting,
        pecas: validatedData.pecas,
        tags: validatedData.tags || [],
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating project', { error, userId: req.user.id });
      return res.status(500).json({ error: 'Failed to create project' });
    }

    logger.info('Project created successfully', { projectId: project.id, userId: req.user.id });

    return res.status(201).json({ project });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error
      });
    }

    logger.error('Error in POST /api/projects', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/projects/:id
 * Update an existing project
 */
router.patch('/projects/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Validate input
    const validatedData = UpdateProjectSchema.parse(req.body);

    // Update project
    const { data: project, error } = await databaseService['supabase']
      .from('projects')
      .update(validatedData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !project) {
      logger.warn('Project not found for update', { projectId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Project not found' });
    }

    logger.info('Project updated successfully', { projectId: id, userId: req.user.id });

    return res.status(200).json({ project });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error
      });
    }

    logger.error('Error in PATCH /api/projects/:id', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete('/projects/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Delete project
    const { error } = await databaseService['supabase']
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      logger.error('Error deleting project', { error, projectId: id, userId: req.user.id });
      return res.status(500).json({ error: 'Failed to delete project' });
    }

    logger.info('Project deleted successfully', { projectId: id, userId: req.user.id });

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/projects/:id', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
