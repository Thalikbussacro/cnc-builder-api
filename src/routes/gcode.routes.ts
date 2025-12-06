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
 * @swagger
 * /api/gcode/generate:
 *   post:
 *     summary: Gera código G-code para corte CNC
 *     description: |
 *       Gera código G-code otimizado a partir de especificações de peças.
 *
 *       **Processo:**
 *       1. Valida entrada com Zod
 *       2. Aplica algoritmo de nesting escolhido
 *       3. Valida configurações
 *       4. Gera G-code
 *       5. Calcula métricas e tempo estimado
 *
 *       **Rate Limit:** 20 requisições/minuto
 *
 *       **Timeout:** 30 segundos
 *     tags:
 *       - G-code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pecas
 *             properties:
 *               pecas:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 1000
 *                 items:
 *                   $ref: '#/components/schemas/Peca'
 *                 description: Lista de peças a serem cortadas
 *               configChapa:
 *                 $ref: '#/components/schemas/ConfigChapa'
 *               configCorte:
 *                 $ref: '#/components/schemas/ConfigCorte'
 *               configMaquina:
 *                 $ref: '#/components/schemas/ConfigMaquina'
 *               metodoNesting:
 *                 type: string
 *                 enum: [greedy, shelf, guillotine]
 *                 default: guillotine
 *                 description: Algoritmo de otimização de posicionamento
 *               incluirComentarios:
 *                 type: boolean
 *                 default: true
 *                 description: Incluir comentários explicativos no G-code
 *           example:
 *             pecas:
 *               - id: "1"
 *                 largura: 100
 *                 altura: 150
 *                 tipoCorte: "externo"
 *                 prioridade: 5
 *               - id: "2"
 *                 largura: 200
 *                 altura: 100
 *                 tipoCorte: "interno"
 *             metodoNesting: "guillotine"
 *             incluirComentarios: true
 *     responses:
 *       200:
 *         description: G-code gerado com sucesso
 *         headers:
 *           X-Request-ID:
 *             $ref: '#/components/headers/X-Request-ID'
 *           X-RateLimit-Limit:
 *             $ref: '#/components/headers/X-RateLimit-Limit'
 *           X-RateLimit-Remaining:
 *             $ref: '#/components/headers/X-RateLimit-Remaining'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GCodeResponse'
 *       400:
 *         description: Dados inválidos ou peças não couberam na chapa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Configurações inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit excedido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Muitas requisições. Tente novamente em 1 minuto."
 *       504:
 *         description: Timeout - processamento excedeu 30 segundos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Request timeout"
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
 * @swagger
 * /api/gcode/validate:
 *   post:
 *     summary: Valida configurações sem gerar G-code
 *     description: |
 *       Valida configurações e retorna preview do nesting sem gerar G-code completo.
 *       Ideal para feedback em tempo real no frontend.
 *
 *       **Recursos:**
 *       - Cache de 5 minutos para validações repetidas
 *       - Preview com peças posicionadas
 *       - Detecção de peças que não couberam
 *       - Cálculo de métricas e tempo estimado
 *
 *       **Rate Limit:** 20 requisições/minuto
 *
 *       **Timeout:** 10 segundos
 *     tags:
 *       - G-code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pecas
 *             properties:
 *               pecas:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 1000
 *                 items:
 *                   $ref: '#/components/schemas/Peca'
 *               configChapa:
 *                 $ref: '#/components/schemas/ConfigChapa'
 *               configCorte:
 *                 $ref: '#/components/schemas/ConfigCorte'
 *               configMaquina:
 *                 $ref: '#/components/schemas/ConfigMaquina'
 *               metodoNesting:
 *                 type: string
 *                 enum: [greedy, shelf, guillotine]
 *                 default: guillotine
 *           example:
 *             pecas:
 *               - id: "1"
 *                 largura: 100
 *                 altura: 100
 *                 tipoCorte: "externo"
 *     responses:
 *       200:
 *         description: Validação concluída (sempre retorna 200, mesmo com erros de validação)
 *         headers:
 *           X-Request-ID:
 *             $ref: '#/components/headers/X-Request-ID'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationResponse'
 *       400:
 *         description: Dados de entrada inválidos (erro de schema Zod)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit excedido
 *       504:
 *         description: Timeout - processamento excedeu 10 segundos
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
 * @swagger
 * /api/cache/stats:
 *   get:
 *     summary: Estatísticas do cache de validação
 *     description: |
 *       Retorna métricas sobre o cache de validações:
 *       - Número de keys armazenadas
 *       - Total de hits (cache encontrado)
 *       - Total de misses (cache não encontrado)
 *       - Taxa de acerto (hit rate)
 *     tags:
 *       - Cache
 *     responses:
 *       200:
 *         description: Estatísticas do cache
 *         headers:
 *           X-Request-ID:
 *             $ref: '#/components/headers/X-Request-ID'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 keys:
 *                   type: number
 *                   description: Número de entradas no cache
 *                   example: 42
 *                 hits:
 *                   type: number
 *                   description: Total de cache hits
 *                   example: 150
 *                 misses:
 *                   type: number
 *                   description: Total de cache misses
 *                   example: 50
 *                 hitRate:
 *                   type: string
 *                   description: Taxa de acerto em porcentagem
 *                   example: "75.00%"
 */
router.get('/cache/stats', (_req, res) => {
  res.json(getCacheStats());
});

export default router;
