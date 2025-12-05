import { Router } from 'express';
import { posicionarPecas, type MetodoNesting } from '../services/nesting-algorithm';
import { gerarGCodeV2, calcularTempoEstimado } from '../services/gcode-generator-v2';
import { mergeWithDefaults, DEFAULT_CONFIG_CHAPA, DEFAULT_CONFIG_CORTE, DEFAULT_CONFIG_FERRAMENTA } from '../utils/defaults';
import { validateConfigurations } from '../services/validator';
import { gcodeGenerationLimiter, validationLimiter } from '../middleware/rate-limit';

const router = Router();

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
router.post('/gcode/generate', gcodeGenerationLimiter, (req, res) => {
  try {
    const {
      pecas,
      configChapa,
      configCorte,
      configFerramenta,
      metodoNesting = 'guillotine' as MetodoNesting,
      incluirComentarios = true
    } = req.body;

    // Validação básica
    if (!pecas || !Array.isArray(pecas) || pecas.length === 0) {
      res.status(400).json({
        error: 'Parâmetro "pecas" é obrigatório e deve ser array não vazio',
      });
      return;
    }

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

    // Se houver erros de validação, retorna HTTP 400
    if (!validationResult.valid) {
      res.status(400).json({
        error: 'Configurações inválidas',
        validation: {
          valid: false,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        }
      });
      return;
    }

    // Verifica se alguma peça não coube
    if (resultadoNesting.naoCouberam.length > 0) {
      res.status(400).json({
        error: 'Algumas peças não couberam na chapa',
        naoCouberam: resultadoNesting.naoCouberam.map(p => ({
          id: p.id,
          nome: p.nome,
          largura: p.largura,
          altura: p.altura
        }))
      });
      return;
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

    res.json({
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

  } catch (error: any) {
    console.error('Erro ao gerar G-code:', error);
    res.status(500).json({
      error: 'Erro ao gerar G-code',
      message: error.message
    });
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
router.post('/gcode/validate', validationLimiter, (req, res) => {
  try {
    const {
      pecas,
      configChapa,
      configCorte,
      configFerramenta,
      metodoNesting = 'guillotine' as MetodoNesting,
    } = req.body;

    // Validação básica de pecas
    if (!pecas || !Array.isArray(pecas) || pecas.length === 0) {
      res.status(400).json({
        error: 'Parâmetro "pecas" é obrigatório e deve ser array não vazio',
      });
      return;
    }

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
    res.json({
      valid: validationResult.valid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      preview: {
        tempoEstimado,
        metricas: resultadoNesting.metricas,
        pecasPosicionadas: resultadoNesting.posicionadas,
        pecasNaoCouberam: resultadoNesting.naoCouberam
      }
    });

  } catch (error: any) {
    console.error('Erro ao validar configurações:', error);
    res.status(500).json({
      error: 'Erro ao validar configurações',
      message: error.message
    });
  }
});

export default router;
