import { z } from 'zod';

/**
 * Schema for creating a new configuration preset
 */
export const CreatePresetSchema = z.object({
  name: z.string()
    .min(1, 'Nome do preset é obrigatório')
    .max(200, 'Nome deve ter no máximo 200 caracteres')
    .trim(),
  description: z.string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional(),
  config_chapa: z.object({}).passthrough(), // Accept any object structure
  config_corte: z.object({}).passthrough(),
  config_ferramenta: z.object({}).passthrough(),
});

/**
 * Schema for updating an existing preset
 */
export const UpdatePresetSchema = z.object({
  name: z.string()
    .min(1, 'Nome do preset é obrigatório')
    .max(200, 'Nome deve ter no máximo 200 caracteres')
    .trim()
    .optional(),
  description: z.string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional(),
  config_chapa: z.object({}).passthrough().optional(),
  config_corte: z.object({}).passthrough().optional(),
  config_ferramenta: z.object({}).passthrough().optional(),
  is_favorite: z.boolean().optional(),
});

/**
 * Schema for query parameters in GET /api/presets
 */
export const GetPresetsQuerySchema = z.object({
  favorites: z.enum(['true', 'false']).optional(),
});

// Export types
export type CreatePresetInput = z.infer<typeof CreatePresetSchema>;
export type UpdatePresetInput = z.infer<typeof UpdatePresetSchema>;
export type GetPresetsQuery = z.infer<typeof GetPresetsQuerySchema>;
