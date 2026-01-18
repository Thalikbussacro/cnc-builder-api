import { z } from 'zod';

/**
 * Schema for creating a new project
 */
export const CreateProjectSchema = z.object({
  name: z.string()
    .min(1, 'Nome do projeto é obrigatório')
    .max(200, 'Nome deve ter no máximo 200 caracteres')
    .trim(),
  description: z.string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional(),
  config_chapa: z.object({}).passthrough(), // Accept any object structure
  config_corte: z.object({}).passthrough(),
  config_ferramenta: z.object({}).passthrough(),
  metodo_nesting: z.enum(['greedy', 'shelf', 'guillotine']),
  pecas: z.array(z.object({}).passthrough()), // Array of piece objects
  tags: z.array(z.string()).default([]),
});

/**
 * Schema for updating an existing project
 */
export const UpdateProjectSchema = z.object({
  name: z.string()
    .min(1, 'Nome do projeto é obrigatório')
    .max(200, 'Nome deve ter no máximo 200 caracteres')
    .trim()
    .optional(),
  description: z.string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional(),
  config_chapa: z.object({}).passthrough().optional(),
  config_corte: z.object({}).passthrough().optional(),
  config_ferramenta: z.object({}).passthrough().optional(),
  metodo_nesting: z.enum(['greedy', 'shelf', 'guillotine']).optional(),
  pecas: z.array(z.object({}).passthrough()).optional(),
  is_favorite: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Schema for query parameters in GET /api/projects
 */
export const GetProjectsQuerySchema = z.object({
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().int().nonnegative()).optional(),
  favorites: z.enum(['true', 'false']).optional(),
});

// Export types
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type GetProjectsQuery = z.infer<typeof GetProjectsQuerySchema>;
