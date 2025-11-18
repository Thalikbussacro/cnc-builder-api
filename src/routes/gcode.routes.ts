import { Router } from 'express';
import { posicionarPecas, type MetodoNesting } from '../services/nesting-algorithm';
import { gerarGCodeV2, calcularTempoEstimado } from '../services/gcode-generator-v2';
import { mergeWithDefaults, DEFAULT_CONFIG_CHAPA, DEFAULT_CONFIG_CORTE, DEFAULT_CONFIG_FERRAMENTA } from '../utils/defaults';

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
router.post('/gcode/generate', (req, res) => {
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

export default router;
