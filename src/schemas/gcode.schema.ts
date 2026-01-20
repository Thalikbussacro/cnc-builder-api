import { z } from 'zod';

export const PecaSchema = z.object({
  largura: z.number().positive('Largura deve ser positiva'),
  altura: z.number().positive('Altura deve ser positiva'),
  tipoCorte: z.enum(['externo', 'interno', 'na-linha']),
  id: z.string().min(1, 'ID obrigatório'),
  nome: z.string().optional(),
  ignorada: z.boolean().optional(),
  numeroOriginal: z.number().optional(),
});

export const ConfigChapaSchema = z.object({
  largura: z.number().positive(),
  altura: z.number().positive(),
  espessura: z.number().positive(),
});

export const ConfigCorteSchema = z.object({
  profundidade: z.number().positive(),
  espacamento: z.number().min(0),
  profundidadePorPassada: z.number().positive(),
  feedrate: z.number().positive(),
  plungeRate: z.number().positive(),
  rapidsSpeed: z.number().positive(),
  spindleSpeed: z.number().positive(),
  usarRampa: z.boolean(),
  tipoRampa: z.enum(['linear', 'zigzag']).optional(),
  anguloRampa: z.number().min(1).max(10),
  aplicarRampaEm: z.enum(['primeira-passada', 'todas-passadas']),
  zigZagAmplitude: z.number().min(0.5).max(10).optional(),
  zigZagPitch: z.number().min(1).max(20).optional(),
  maxRampStepZ: z.number().min(0.1).max(2).optional(),
  usarMesmoEspacamentoBorda: z.boolean(),
  margemBorda: z.number().min(0),
});

export const ConfigFerramentaSchema = z.object({
  diametro: z.number().positive(),
  numeroFerramenta: z.number().int().positive(),
});

export const GenerateRequestSchema = z.object({
  pecas: z.array(PecaSchema).min(1, 'Pelo menos uma peça obrigatória').max(1000, 'Máximo 1000 peças'),
  configChapa: ConfigChapaSchema.partial().optional(),
  configCorte: ConfigCorteSchema.partial().optional(),
  configFerramenta: ConfigFerramentaSchema.partial().optional(),
  metodoNesting: z.enum(['greedy', 'shelf', 'guillotine']).optional(),
  incluirComentarios: z.boolean().optional(),
});

export const ValidateRequestSchema = GenerateRequestSchema.omit({ incluirComentarios: true });
