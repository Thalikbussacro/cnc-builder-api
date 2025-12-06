import { Router } from 'express';
import { z } from 'zod';
import { posicionarPecas, type MetodoNesting } from '../services/nesting-algorithm';
import { gerarGCodeV2, calcularTempoEstimado } from '../services/gcode-generator-v2';
import { mergeWithDefaults, DEFAULT_CONFIG_CHAPA, DEFAULT_CONFIG_CORTE, DEFAULT_CONFIG_FERRAMENTA } from '../utils/defaults';
import { validateConfigurations } from '../services/validator';
import { gcodeGenerationLimiter, validationLimiter } from '../middleware/rate-limit';
import { validationCache, getCacheKey, getCacheStats } from '../services/cache';
import { BadRequestError, ValidationError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { GenerateRequestSchema, ValidateRequestSchema } from '../schemas/gcode.schema';

const router = Router();

/**
 * Middleware para adicionar timeout a requests
 */
function withTimeout(timeoutMs: number) {
  return (_req: any, res: any, next: any) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: 'Request timeout',
          message: `Processamento excedeu ${timeoutMs / 1000} segundos`,
        });
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timer));
    next();
  };
}

/**
 * POST /api/gcode/generate
 *
 * Body (todos campos opcionais exceto 'pecas'):
 * {
 *   pecas: Peca[],                          // OBRIGATÓRIO
 *   configChapa?: Partial<ConfiguracoesChapa>,
 *   configCorte?: Partial<ConfiguracoesCorte>,
 *   configFerramenta?: Partial<ConfiguracoesFerramenta>,
 *   metodoNesting?: 'greedy' | 'shelf' | 'guillotine',  // Default: guillotine
 *   incluirComentarios?: boolean            // Default: true
 * }
 *
 * Response:
 * {
 *   gcode: string,
 *   metadata: {
 *     linhas: number,
 *     tamanhoBytes: number,
 *     tempoEstimado: { ... },
 *     metricas: { areaUtilizada, eficiencia },
 *     configuracoes: { ... }  // Configurações finais aplicadas
 *   }
 * }
 */
router.post('/gcode/generate', gcodeGenerationLimiter, withTimeout(30000), (req, res, next) => {
  try {
    // Valida e parseia request com Zod
    const validatedData = GenerateRequestSchema.parse(req.body);

    const {
      pecas,
      configChapa,
      configCorte,
      configFerramenta,
      metodoNesting = 'guillotine' as MetodoNesting,
      incluirComentarios = true
    } = validatedData;

    // Mescla com defaults
    const configChapaFinal = mergeWithDefaults(configChapa || {}, DEFAULT_CONFIG_CHAPA);
    const configCorteFinal = mergeWithDefaults(configCorte || {}, DEFAULT_CONFIG_CORTE);
    const configFerramentaFinal = configFerramenta
      ? mergeWithDefaults(configFerramenta, DEFAULT_CONFIG_FERRAMENTA)
      : undefined;

    // Calcula margem de borda
    const margemBorda = configCorteFinal.usarMesmoEspacamentoBorda
      ? undefined
      : configCorteFinal.margemBorda;

    // Executa nesting
    const resultadoNesting = posicionarPecas(
      pecas,
      configChapaFinal.largura,
      configChapaFinal.altura,
      configCorteFinal.espacamento,
      metodoNesting,
      margemBorda
    );

    // VALIDAÇÃO OBRIGATÓRIA: Valida configurações antes de gerar G-code
    const validationResult = validateConfigurations(
      configChapaFinal,
      configCorteFinal,
      configFerramentaFinal || DEFAULT_CONFIG_FERRAMENTA,
      resultadoNesting.posicionadas
    );

    // Se houver erros de validação, lança erro
    if (!validationResult.valid) {
      throw new ValidationError('Configurações inválidas');
    }

    // Verifica se alguma peça não coube
    if (resultadoNesting.naoCouberam.length > 0) {
      throw new BadRequestError('Algumas peças não couberam na chapa');
    }

    // Gera G-code
    const gcode = gerarGCodeV2(
      resultadoNesting.posicionadas,
      configChapaFinal,
      configCorteFinal,
      configFerramentaFinal,
      incluirComentarios
    );

    // Calcula tempo estimado
    const tempoEstimado = calcularTempoEstimado(
      resultadoNesting.posicionadas,
      configChapaFinal,
      configCorteFinal
    );

    // Metadata
    const linhas = gcode.split('\n').length;
    const tamanhoBytes = Buffer.byteLength(gcode, 'utf8');

    return res.json({
      gcode,
      metadata: {
        linhas,
        tamanhoBytes,
        tempoEstimado,
        metricas: resultadoNesting.metricas,
        configuracoes: {
          chapa: configChapaFinal,
          corte: configCorteFinal,
          ferramenta: configFerramentaFinal,
          nesting: {
            metodo: metodoNesting,
            pecasPosicionadas: resultadoNesting.posicionadas.length,
            eficiencia: resultadoNesting.metricas.eficiencia
          }
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.issues,
      });
    }
    return next(error);
  }
});

/**
 * POST /api/gcode/validate
 *
 * Valida configurações sem gerar G-code (útil para feedback em tempo real no frontend)
 *
 * Body (mesmos parâmetros do /generate):
 * {
 *   pecas: Peca[],
 *   configChapa?: Partial<ConfiguracoesChapa>,
 *   configCorte?: Partial<ConfiguracoesCorte>,
 *   configFerramenta?: Partial<ConfiguracoesFerramenta>,
 *   metodoNesting?: 'greedy' | 'shelf' | 'guillotine'
 * }
 *
 * Response:
 * {
 *   valid: boolean,
 *   errors: ValidationIssue[],
 *   warnings: ValidationIssue[]
 * }
 */
router.post('/gcode/validate', validationLimiter, withTimeout(10000), (req, res, next) => {
  try {
    // Valida e parseia request com Zod
    const validatedData = ValidateRequestSchema.parse(req.body);

    const {
      pecas,
      configChapa,
      configCorte,
      configFerramenta,
      metodoNesting = 'guillotine' as MetodoNesting,
    } = validatedData;

    // Verificar cache
    const cacheKey = getCacheKey({ pecas, configChapa, configCorte, configFerramenta, metodoNesting });
    const cached = validationCache.get(cacheKey);

    if (cached) {
      logger.info('✅ Cache HIT', { endpoint: '/validate' });
      res.json(cached);
      return;
    }

    logger.info('❌ Cache MISS', { endpoint: '/validate' });

    // Mescla com defaults
    const configChapaFinal = mergeWithDefaults(configChapa || {}, DEFAULT_CONFIG_CHAPA);
    const configCorteFinal = mergeWithDefaults(configCorte || {}, DEFAULT_CONFIG_CORTE);
    const configFerramentaFinal = configFerramenta
      ? mergeWithDefaults(configFerramenta, DEFAULT_CONFIG_FERRAMENTA)
      : DEFAULT_CONFIG_FERRAMENTA;

    // Calcula margem de borda
    const margemBorda = configCorteFinal.usarMesmoEspacamentoBorda
      ? undefined
      : configCorteFinal.margemBorda;

    // Executa nesting para obter peças posicionadas
    const resultadoNesting = posicionarPecas(
      pecas,
      configChapaFinal.largura,
      configChapaFinal.altura,
      configCorteFinal.espacamento,
      metodoNesting,
      margemBorda
    );

    // Valida configurações
    const validationResult = validateConfigurations(
      configChapaFinal,
      configCorteFinal,
      configFerramentaFinal,
      resultadoNesting.posicionadas
    );

    // Calcula tempo estimado para preview
    const tempoEstimado = calcularTempoEstimado(
      resultadoNesting.posicionadas,
      configChapaFinal,
      configCorteFinal
    );

    // Retorna resultado da validação com dados de preview (sempre HTTP 200, mesmo com erros)
    const result = {
      valid: validationResult.valid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      preview: {
        tempoEstimado,
        metricas: resultadoNesting.metricas,
        pecasPosicionadas: resultadoNesting.posicionadas,
        pecasNaoCouberam: resultadoNesting.naoCouberam
      }
    };

    // Salvar no cache
    validationCache.set(cacheKey, result);

    return res.json(result);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.issues,
      });
    }
    return next(error);
  }
});

/**
 * GET /api/cache/stats
 *
 * Retorna estatísticas do cache de validação
 */
router.get('/cache/stats', (_req, res) => {
  res.json(getCacheStats());
});

export default router;
