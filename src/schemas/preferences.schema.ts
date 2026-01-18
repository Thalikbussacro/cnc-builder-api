import { z } from 'zod';

/**
 * Schema for updating user preferences (upsert)
 */
export const UpdatePreferencesSchema = z.object({
  default_versao_gerador: z.enum(['v1', 'v2']).optional(),
  default_incluir_comentarios: z.boolean().optional(),
  default_metodo_nesting: z.enum(['greedy', 'shelf', 'guillotine']).optional(),
  default_config_chapa: z.object({}).passthrough().nullable().optional(),
  default_config_corte: z.object({}).passthrough().nullable().optional(),
  default_config_ferramenta: z.object({}).passthrough().nullable().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
});

// Export types
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;
