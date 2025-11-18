import type { PecaPosicionada, ConfiguracoesChapa, ConfiguracoesCorte, ConfiguracoesFerramenta, TempoEstimado } from "../types";

/**
 * Formata número para G-code com otimização (remove zeros desnecessários)
 * @param num - Número a ser formatado
 * @param decimals - Número máximo de casas decimais (padrão: 2)
 * @returns String formatada otimizada
 */
function formatarNumero(num: number, decimals: number = 2): string {
  // Remove zeros desnecessários à direita
  return parseFloat(num.toFixed(decimals)).toString().replace(',', '.');
}

/**
 * Remove acentuação de uma string para compatibilidade com controladores CNC
 * @param texto - Texto com possível acentuação
 * @returns Texto sem acentuação
 */
function removerAcentos(texto: string): string {
  return texto
    .replace(/[áàâãä]/g, 'a')
    .replace(/[ÁÀÂÃÄ]/g, 'A')
    .replace(/[éèêë]/g, 'e')
    .replace(/[ÉÈÊË]/g, 'E')
    .replace(/[íìîï]/g, 'i')
    .replace(/[ÍÌÎÏ]/g, 'I')
    .replace(/[óòôõö]/g, 'o')
    .replace(/[ÓÒÔÕÖ]/g, 'O')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ÚÙÛÜ]/g, 'U')
    .replace(/[ç]/g, 'c')
    .replace(/[Ç]/g, 'C');
}

/**
 * Calcula a distância horizontal necessária para uma rampa de entrada
 * @param profundidade - Profundidade a descer (mm)
 * @param anguloGraus - Ângulo da rampa em graus
 * @returns Distância horizontal necessária (mm)
 *
 * NOTA: Retorna apenas a distância HORIZONTAL (projeção no plano XY).
 * A distância real percorrida pela fresa será ligeiramente maior (hipotenusa).
 */
function calcularDistanciaRampa(profundidade: number, anguloGraus: number): number {
  const anguloRadianos = (anguloGraus * Math.PI) / 180;
  return profundidade / Math.tan(anguloRadianos);
}

/**
 * Calcula o feedrate ajustado para rampa linear
 * @param feedrateNormal - Feedrate normal de corte (mm/min)
 * @param anguloGraus - Ângulo da rampa em graus
 * @returns Feedrate ajustado para rampa
 *
 * Baseado em melhores práticas:
 * - Ângulos até 5°: 70% do feedrate normal
 * - Ângulos acima de 5°: 50% do feedrate normal
 */
function calcularFeedrateRampa(feedrateNormal: number, anguloGraus: number): number {
  if (anguloGraus > 5) {
    return Math.round(feedrateNormal * 0.5); // 50% para ângulos agressivos
  }
  return Math.round(feedrateNormal * 0.7); // 70% para ângulos conservadores
}

/**
 * Determina se a peça tem tamanho suficiente para rampa INTERNA
 * @param peca - Peça posicionada
 * @param distanciaRampa - Distância horizontal necessária para rampa (mm)
 * @returns Objeto indicando se rampa é possível e qual direção usar
 *
 * IMPORTANTE: Rampa agora é INTERNA (dentro da peça), não externa!
 * A rampa acontece DURANTE o primeiro lado do corte, não antes.
 */
function determinarDirecaoRampa(
  peca: PecaPosicionada,
  distanciaRampa: number
): { deltaX: number; deltaY: number; temEspaco: boolean; usarLadoX: boolean } {
  // Verifica se a LARGURA da peça comporta a rampa (no eixo X)
  const larguraSuficiente = peca.largura >= distanciaRampa;

  if (larguraSuficiente) {
    // Rampa no lado inferior (movimento +X enquanto desce Z)
    return { deltaX: 1, deltaY: 0, temEspaco: true, usarLadoX: true };
  }

  // Verifica se a ALTURA da peça comporta a rampa (no eixo Y)
  const alturaSuficiente = peca.altura >= distanciaRampa;

  if (alturaSuficiente) {
    // Rampa no lado esquerdo (movimento +Y enquanto desce Z)
    return { deltaX: 0, deltaY: 1, temEspaco: true, usarLadoX: false };
  }

  // Peça muito pequena para rampa interna
  return { deltaX: 0, deltaY: 0, temEspaco: false, usarLadoX: false };
}

/**
 * Estado da máquina para controle modal
 */
type EstadoMaquina = {
  posX: number;
  posY: number;
  posZ: number;
  feedrate: number | null;
  compensacaoAtiva: boolean;
};

/**
 * GERADOR G-CODE V2 - OTIMIZADO
 *
 * Otimizações implementadas:
 * - Remove movimentos Z redundantes
 * - Remove parâmetro F de comandos G0
 * - Mantém G41/G42 ativo durante todas passadas da mesma peça
 * - Elimina reposicionamentos XY desnecessários
 * - Controle modal de feedrate (só declara quando muda)
 * - Comentários simplificados
 * - Formato numérico otimizado (sem zeros desnecessários)
 */
export function gerarGCodeV2(
  pecasPos: PecaPosicionada[],
  config: ConfiguracoesChapa,
  corte: ConfiguracoesCorte,
  ferramenta?: ConfiguracoesFerramenta,
  incluirComentarios: boolean = true
): string {
  const { largura: chapaL, altura: chapaA } = config;
  const { profundidade, profundidadePorPassada, feedrate, plungeRate, rapidsSpeed, spindleSpeed, usarRampa, anguloRampa, aplicarRampaEm } = corte;

  // Validações de segurança para prevenir loops infinitos e valores inválidos
  if (!profundidade || profundidade <= 0) {
    return `; ERRO: Profundidade invalida (${profundidade}mm). Deve ser maior que zero.\n`;
  }

  if (!profundidadePorPassada || profundidadePorPassada <= 0) {
    return `; ERRO: Profundidade por passada invalida (${profundidadePorPassada}mm). Deve ser maior que zero.\n`;
  }

  if (profundidadePorPassada > profundidade) {
    return `; ERRO: Profundidade por passada (${profundidadePorPassada}mm) maior que profundidade total (${profundidade}mm).\n`;
  }

  // Validação: rapidsSpeed pode ser undefined em localStorage antigo
  const rapidsSpeedSafe = rapidsSpeed || 4000;

  // Calcula tempo estimado
  const tempo = calcularTempoEstimado(pecasPos, config, corte);

  let gcode = '';

  // Estado da máquina para otimizações
  const estado: EstadoMaquina = {
    posX: 0,
    posY: 0,
    posZ: 5,
    feedrate: null,
    compensacaoAtiva: false
  };

  // === CABEÇALHO SIMPLIFICADO (SOMENTE SE incluirComentarios === true) ===
  if (incluirComentarios) {
    const dataHora = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    gcode += `; === G-CODE V2 OTIMIZADO ===\n`;
    gcode += `; Gerado em: ${dataHora}\n`;
    gcode += `; Versao do Gerador: V2.0 (Otimizado)\n`;
    gcode += `; Chapa ${formatarNumero(chapaL, 0)}x${formatarNumero(chapaA, 0)}mm, Prof ${formatarNumero(profundidade, 0)}mm\n`;
    gcode += `; \n`;
    gcode += `; TEMPO ESTIMADO: ${formatarTempo(tempo.tempoTotal)}\n`;
    gcode += `; Detalhamento: Corte ${formatarTempo(tempo.tempoCorte)} | Mergulho ${formatarTempo(tempo.tempoMergulho)} | Rapids ${formatarTempo(tempo.tempoPosicionamento)}\n`;
    gcode += `; \n`;
    gcode += `; DISTANCIAS PERCORRIDAS:\n`;
    gcode += `; Total: ${formatarNumero(tempo.distanciaTotal || 0, 0)}mm\n`;
    gcode += `; Corte: ${formatarNumero(tempo.distanciaCorte || 0, 0)}mm | Mergulho: ${formatarNumero(tempo.distanciaMergulho || 0, 0)}mm | Rapids: ${formatarNumero(tempo.distanciaPosicionamento || 0, 0)}mm\n`;
    gcode += `; \n`;
    gcode += `; Spindle: ${spindleSpeed}RPM | Feed: ${feedrate}mm/min | Plunge: ${plungeRate}mm/min | Rapids: ${rapidsSpeedSafe}mm/min\n`;

    // SEGURANÇA: Verificar velocidades fora de ranges seguros
    const alertasVelocidade: string[] = [];

    // Spindle Speed: 8000-24000 RPM é um range típico para CNCs hobby/semi-profissionais
    if (spindleSpeed < 8000) {
      alertasVelocidade.push(`Spindle ${spindleSpeed}RPM muito baixo (recomendado: 8000-24000 RPM)`);
    } else if (spindleSpeed > 30000) {
      alertasVelocidade.push(`Spindle ${spindleSpeed}RPM muito alto (recomendado: 8000-24000 RPM)`);
    }

    // Feedrate: depende do material, mas 500-3000 mm/min é típico para madeira/MDF
    if (feedrate < 300) {
      alertasVelocidade.push(`Feedrate ${feedrate}mm/min muito baixo (pode queimar material)`);
    } else if (feedrate > 5000) {
      alertasVelocidade.push(`Feedrate ${feedrate}mm/min muito alto (risco de quebra de fresa)`);
    }

    // PlungeRate: geralmente 1/3 a 1/2 do feedrate
    if (plungeRate > feedrate) {
      alertasVelocidade.push(`PlungeRate ${plungeRate}mm/min > Feedrate (risco de quebra)`);
    } else if (plungeRate < 100) {
      alertasVelocidade.push(`PlungeRate ${plungeRate}mm/min muito baixo (processo lento)`);
    }

    // Rapids Speed: 2000-6000 mm/min é típico
    if (rapidsSpeedSafe < 1000) {
      alertasVelocidade.push(`Rapids ${rapidsSpeedSafe}mm/min muito baixo (processo lento)`);
    } else if (rapidsSpeedSafe > 10000) {
      alertasVelocidade.push(`Rapids ${rapidsSpeedSafe}mm/min muito alto (verifique limites da maquina)`);
    }

    if (alertasVelocidade.length > 0) {
      gcode += `; \n`;
      gcode += `; ALERTAS DE VELOCIDADE:\n`;
      for (const alerta of alertasVelocidade) {
        gcode += `; - ${alerta}\n`;
      }
    }

    if (ferramenta) {
      gcode += `; Ferramenta: T${ferramenta.numeroFerramenta} (D${formatarNumero(ferramenta.diametro)}mm)\n`;
    }

    if (usarRampa) {
      const distEx = calcularDistanciaRampa(profundidadePorPassada, anguloRampa);
      const feedrateRampa = calcularFeedrateRampa(feedrate, anguloRampa);
      gcode += `; Rampa INTERNA: ${formatarNumero(anguloRampa, 1)}° (~${formatarNumero(distEx, 0)}mm dentro da peca)\n`;
      gcode += `; Feedrate rampa: ${feedrateRampa}mm/min (${anguloRampa > 5 ? '50%' : '70%'} do normal)\n`;
      gcode += `; NOTA: Rampa acontece DURANTE o 1o lado do corte (nao precisa espaco externo!)\n`;
      gcode += `; Tamanho minimo da peca: ${formatarNumero(distEx, 0)}mm (largura OU altura)\n`;

      // Aviso se ângulo for muito agressivo ou muito conservador
      if (anguloRampa < 2) {
        gcode += `; AVISO: Angulo ${formatarNumero(anguloRampa, 1)}° muito baixo (rampa muito longa)\n`;
      } else if (anguloRampa > 5) {
        gcode += `; AVISO: Angulo ${formatarNumero(anguloRampa, 1)}° agressivo (feedrate reduzido para 50%)\n`;
      }
    }

    // Calcula número de passadas com tolerância para arredondamento
    // Adiciona pequena tolerância (0.01) para evitar erros de ponto flutuante
    // Ex: 16/5.33 = 3.0018... deve ser 3, não 4
    const numPassadas = Math.round(profundidade / profundidadePorPassada + 0.01);
    gcode += `; Passadas: ${numPassadas} x ${formatarNumero(profundidadePorPassada)}mm\n`;

    // SEGURANÇA: Verificar profundidade vs espessura da chapa
    if (profundidade > config.espessura) {
      gcode += `; \n`;
      gcode += `; AVISO SEGURANCA: Profundidade ${formatarNumero(profundidade)}mm > Espessura chapa ${formatarNumero(config.espessura)}mm!\n`;
      gcode += `; RISCO: Ferramenta pode mergulhar na mesa de trabalho!\n`;
      gcode += `; SOLUCAO: Ajuste profundidade para <= ${formatarNumero(config.espessura)}mm\n`;
    } else if (profundidade < config.espessura) {
      gcode += `; \n`;
      gcode += `; AVISO: Profundidade ${formatarNumero(profundidade)}mm < Espessura chapa ${formatarNumero(config.espessura)}mm\n`;
      gcode += `; Corte nao atravessara completamente a chapa\n`;
    }

    // AVISO: Verificar espaçamento com compensação de ferramenta
    if (ferramenta) {
      const espacamentoConfig = corte.espacamento || 0;
      const diametroFerramenta = ferramenta.diametro;
      const espacamentoReal = espacamentoConfig - diametroFerramenta;
      const raio = diametroFerramenta / 2;

      gcode += `; \n`;
      gcode += `; IMPORTANTE: Espacamento configurado ${espacamentoConfig}mm\n`;
      gcode += `; Com compensacao G41/G42 (fresa D${formatarNumero(diametroFerramenta)}mm):\n`;
      gcode += `; Espaco real entre pecas: ~${formatarNumero(espacamentoReal)}mm\n`;

      if (espacamentoReal < diametroFerramenta) {
        gcode += `; AVISO: Espaco real menor que diametro da fresa!\n`;
        gcode += `; Recomendado: espacamento >= ${formatarNumero(diametroFerramenta * 2)}mm\n`;
      }

      // Verificar se peças com compensação ultrapassam limites da chapa
      let areaExcedida = false;
      for (const peca of pecasPos) {
        if (peca.tipoCorte !== 'na-linha') {
          // Para corte externo, a compensação aumenta a área
          // Para corte interno, a compensação diminui a área (não afeta limites da chapa)
          if (peca.tipoCorte === 'externo') {
            const xMax = peca.x + peca.largura + raio;
            const yMax = peca.y + peca.altura + raio;
            const xMin = peca.x - raio;
            const yMin = peca.y - raio;

            if (xMax > chapaL || yMax > chapaA || xMin < 0 || yMin < 0) {
              areaExcedida = true;
              gcode += `; AVISO: Peca "${peca.nome || 'sem nome'}" com compensacao ultrapassa limites da chapa!\n`;
            }
          }
        }
      }

      if (areaExcedida) {
        gcode += `; SOLUCAO: Reduza espacamento ou reposicione pecas\n`;
      }

      // Verificar colisões entre peças considerando compensação
      gcode += `; \n`;
      let colisaoDetectada = false;
      for (let i = 0; i < pecasPos.length; i++) {
        const p1 = pecasPos[i];
        const offset1 = p1.tipoCorte === 'externo' ? raio : 0;

        for (let j = i + 1; j < pecasPos.length; j++) {
          const p2 = pecasPos[j];
          const offset2 = p2.tipoCorte === 'externo' ? raio : 0;

          // Expande os limites de cada peça com a compensação
          const p1MinX = p1.x - offset1;
          const p1MaxX = p1.x + p1.largura + offset1;
          const p1MinY = p1.y - offset1;
          const p1MaxY = p1.y + p1.altura + offset1;

          const p2MinX = p2.x - offset2;
          const p2MaxX = p2.x + p2.largura + offset2;
          const p2MinY = p2.y - offset2;
          const p2MaxY = p2.y + p2.altura + offset2;

          // Verifica sobreposição (AABB collision detection)
          const colisao = !(p1MaxX <= p2MinX || p1MinX >= p2MaxX || p1MaxY <= p2MinY || p1MinY >= p2MaxY);

          if (colisao) {
            colisaoDetectada = true;
            const nome1 = p1.nome || `Peca ${i + 1}`;
            const nome2 = p2.nome || `Peca ${j + 1}`;
            gcode += `; AVISO COLISAO: "${nome1}" e "${nome2}" podem colidir com compensacao!\n`;
          }
        }
      }

      if (colisaoDetectada) {
        gcode += `; SOLUCAO: Aumente espacamento entre pecas\n`;
      }
    }

    // ========================================================================
    // VALIDAÇÃO DE RAMPA INTERNA
    // ========================================================================
    if (usarRampa) {
      const distanciaRampaNecessaria = calcularDistanciaRampa(profundidadePorPassada, anguloRampa);
      gcode += `; \n`;
      gcode += `; ========================================================================\n`;
      gcode += `; VALIDACAO DE RAMPA INTERNA\n`;
      gcode += `; ========================================================================\n`;
      gcode += `; Tamanho minimo necessario: ${formatarNumero(distanciaRampaNecessaria, 0)}mm (largura OU altura)\n`;
      gcode += `; \n`;

      let pecasPequenas = 0;

      for (let i = 0; i < pecasPos.length; i++) {
        const peca = pecasPos[i];
        const nome = peca.nome || `Peca ${i + 1}`;

        // ÚNICO PROBLEMA: Peça muito pequena para rampa interna
        const larguraSuficiente = peca.largura >= distanciaRampaNecessaria;
        const alturaSuficiente = peca.altura >= distanciaRampaNecessaria;

        if (!larguraSuficiente && !alturaSuficiente) {
          pecasPequenas++;
          gcode += `; AVISO - "${nome}" (${formatarNumero(peca.largura, 0)}x${formatarNumero(peca.altura, 0)}mm):\n`;
          gcode += `;   Peca muito pequena para rampa de ${formatarNumero(distanciaRampaNecessaria, 0)}mm\n`;
          gcode += `;   >> SOLUCAO: Usara MERGULHO VERTICAL\n`;
          gcode += `; \n`;
        }
      }

      if (pecasPequenas > 0) {
        gcode += `; ========================================================================\n`;
        gcode += `; RESUMO: ${pecasPequenas}/${pecasPos.length} pecas usarao mergulho vertical\n`;
        gcode += `; ========================================================================\n`;
        gcode += `; \n`;
        gcode += `; ATENCAO: Pecas listadas acima usarao MERGULHO VERTICAL.\n`;
        gcode += `; Isso pode causar:\n`;
        gcode += `;   - Maior desgaste na ferramenta\n`;
        gcode += `;   - Marcas no ponto de entrada\n`;
        gcode += `;   - Risco de quebra da fresa (se material for duro)\n`;
        gcode += `; \n`;
        gcode += `; RECOMENDACOES:\n`;
        gcode += `;   1. Aumente tamanho das pecas para >= ${formatarNumero(distanciaRampaNecessaria, 0)}mm\n`;
        gcode += `;   2. Reduza angulo da rampa (ex: 2° ao inves de ${formatarNumero(anguloRampa, 1)}°)\n`;
        gcode += `;   3. Ou desative rampa completamente (mergulho vertical em todas)\n`;
        gcode += `; \n`;
      } else {
        gcode += `; ========================================================================\n`;
        gcode += `; OK: Todas as ${pecasPos.length} pecas usarao RAMPA INTERNA!\n`;
        gcode += `; ========================================================================\n`;
        gcode += `; \n`;
      }
    }

    gcode += '\n';
  }

  // Calcula número de passadas com tolerância para arredondamento
  // Adiciona pequena tolerância (0.01) para evitar erros de ponto flutuante
  // Ex: 16/5.33 = 3.0018... deve ser 3, não 4
  const numPassadas = Math.round(profundidade / profundidadePorPassada + 0.01);

  // === INICIALIZAÇÃO ===
  gcode += incluirComentarios ? 'G21 ; Define unidades em milímetros\n' : 'G21\n';
  gcode += incluirComentarios ? 'G90 ; Usa coordenadas absolutas\n' : 'G90\n';
  gcode += incluirComentarios ? 'G0 Z5 ; Levanta a fresa para posição segura\n' : 'G0 Z5\n';

  if (ferramenta) {
    gcode += incluirComentarios
      ? `T${ferramenta.numeroFerramenta} M6 ; Troca para ferramenta T${ferramenta.numeroFerramenta}\n`
      : `T${ferramenta.numeroFerramenta} M6\n`;
  }

  gcode += incluirComentarios ? `M3 S${spindleSpeed} ; Liga o spindle\n` : `M3 S${spindleSpeed}\n`;
  gcode += incluirComentarios ? 'G0 X0 Y0 ; Posiciona em origem antes de iniciar corte\n\n' : 'G0 X0 Y0\n\n';

  // === PROCESSAMENTO DE PEÇAS ===
  for (const peca of pecasPos) {
    const numeroPeca = peca.numeroOriginal || pecasPos.indexOf(peca) + 1;

    // Se a peça está marcada como ignorada, adiciona apenas comentário
    if (peca.ignorada) {
      gcode += `; ========================================\n`;
      if (peca.nome) {
        gcode += `; PECA #${numeroPeca} (${peca.nome}) - IGNORADA\n`;
      } else {
        gcode += `; PECA #${numeroPeca} - IGNORADA\n`;
      }
      gcode += `; Dimensoes: ${formatarNumero(peca.largura, 0)}x${formatarNumero(peca.altura, 0)}mm\n`;
      gcode += `; Tipo de corte: ${peca.tipoCorte}\n`;
      gcode += `; Posicao: X${formatarNumero(peca.x, 0)} Y${formatarNumero(peca.y, 0)}\n`;
      gcode += `; ========================================\n\n`;
      continue; // Pula para próxima peça
    }

    // Cabeçalho da peça
    if (incluirComentarios) {
      const nomePeca = peca.nome || `Peca ${numeroPeca}`;
      gcode += `; === ${nomePeca} (${formatarNumero(peca.largura, 0)}x${formatarNumero(peca.altura, 0)}mm) ===\n`;
    }

    // === COMPENSAÇÃO DE FERRAMENTA (MANUAL) ===
    // IMPORTANTE: Compensação calculada matematicamente no código (não usa G41/G42)
    // Isso garante compatibilidade com todos os controladores CNC
    const raioFerramenta = ferramenta ? ferramenta.diametro / 2 : 0;
    const aplicarOffset = ferramenta && peca.tipoCorte !== 'na-linha';

    // Calcula ponto inicial (com compensação se aplicável)
    let pontoInicialX = peca.x;
    let pontoInicialY = peca.y;

    if (aplicarOffset) {
      const offset = raioFerramenta;
      if (peca.tipoCorte === 'externo') {
        // Corte externo: começa ANTES do canto (expandido)
        pontoInicialX -= offset;
        pontoInicialY -= offset;
      } else if (peca.tipoCorte === 'interno') {
        // Corte interno: começa DEPOIS do canto (reduzido)
        pontoInicialX += offset;
        pontoInicialY += offset;
      }
    }

    if (aplicarOffset && incluirComentarios) {
      if (peca.tipoCorte === 'externo') {
        gcode += `; COMPENSACAO MANUAL: Corte externo - caminho expandido +${formatarNumero(raioFerramenta)}mm (raio da fresa)\n`;
        gcode += `; Peca final: ${formatarNumero(peca.largura)}x${formatarNumero(peca.altura)}mm (dimensoes exatas)\n`;
      } else if (peca.tipoCorte === 'interno') {
        gcode += `; COMPENSACAO MANUAL: Corte interno - caminho reduzido -${formatarNumero(raioFerramenta)}mm (raio da fresa)\n`;
        gcode += `; Furo final: ${formatarNumero(peca.largura)}x${formatarNumero(peca.altura)}mm (dimensoes exatas)\n`;
      }
    }

    // Posiciona no início da peça (com compensação aplicada)
    if (estado.posX !== pontoInicialX || estado.posY !== pontoInicialY) {
      // SEGURANÇA: Garante Z em posição segura antes de movimento XY
      if (estado.posZ < 5) {
        gcode += incluirComentarios ? 'G0 Z5 ; Levanta fresa para posição segura\n' : 'G0 Z5\n';
        estado.posZ = 5;
      }
      gcode += incluirComentarios
        ? `G0 X${formatarNumero(pontoInicialX)} Y${formatarNumero(pontoInicialY)} ; Posiciona no início da peça\n`
        : `G0 X${formatarNumero(pontoInicialX)} Y${formatarNumero(pontoInicialY)}\n`;
      estado.posX = pontoInicialX;
      estado.posY = pontoInicialY;
    }

    // === PASSADAS ===
    for (let j = 1; j <= numPassadas; j++) {
      const z = -Math.min(j * profundidadePorPassada, profundidade);
      const zAnterior = j === 1 ? 0 : -Math.min((j - 1) * profundidadePorPassada, profundidade);
      const profundidadeIncrementalPassada = Math.abs(z - zAnterior); // Profundidade DESTA passada apenas
      const ehPrimeiraPassada = j === 1;

      if (incluirComentarios) {
        gcode += `\n; Passada ${j}/${numPassadas}\n`;
      }

      // === ENTRADA (RAMPA OU VERTICAL) ===
      // RAMPA INTERNA: Rampa acontece DURANTE o primeiro lado do corte
      // Não precisa de espaço externo, usa a própria peça!
      // IMPORTANTE: Calcula rampa baseado na profundidade INCREMENTAL (não acumulada)
      const distanciaRampa = calcularDistanciaRampa(profundidadeIncrementalPassada, anguloRampa);
      const direcao = determinarDirecaoRampa(peca, distanciaRampa);

      // Decide se usa rampa baseado na configuração do usuário
      const deveUsarRampaNaPassada = aplicarRampaEm === 'todas-passadas' || ehPrimeiraPassada;
      const usarRampaNestaPeca = usarRampa && deveUsarRampaNaPassada && direcao.temEspaco;

      // IMPORTANTE: Se vai usar rampa, SEMPRE levantar fresa antes de CADA passada
      // Isso garante que a rampa comece do ponto inicial em Z seguro
      if (usarRampaNestaPeca) {
        // Sempre levanta se vai usar rampa (independente da posição Z atual)
        if (estado.posZ !== 5) {
          gcode += incluirComentarios ? 'G0 Z5 ; Levanta fresa para posição segura (rampa)\n' : 'G0 Z5\n';
          estado.posZ = 5;
        }
        // SEMPRE reposiciona no ponto inicial para rampa (mesmo se já estiver lá)
        // Isso garante que a rampa comece corretamente em cada passada
        gcode += incluirComentarios
          ? `G0 X${formatarNumero(pontoInicialX)} Y${formatarNumero(pontoInicialY)} ; Posiciona no início da peça (rampa)\n`
          : `G0 X${formatarNumero(pontoInicialX)} Y${formatarNumero(pontoInicialY)}\n`;
        estado.posX = pontoInicialX;
        estado.posY = pontoInicialY;
      } else {
        // SEM rampa: reposiciona apenas se necessário
        if (estado.posX !== pontoInicialX || estado.posY !== pontoInicialY) {
          // Levanta se ainda não levantou
          if (estado.posZ < 5) {
            gcode += incluirComentarios ? 'G0 Z5 ; Levanta fresa para posição segura\n' : 'G0 Z5\n';
            estado.posZ = 5;
          }
          gcode += incluirComentarios
            ? `G0 X${formatarNumero(pontoInicialX)} Y${formatarNumero(pontoInicialY)} ; Posiciona no início da peça\n`
            : `G0 X${formatarNumero(pontoInicialX)} Y${formatarNumero(pontoInicialY)}\n`;
          estado.posX = pontoInicialX;
          estado.posY = pontoInicialY;
        }
      }

      if (!usarRampaNestaPeca) {
        // MERGULHO VERTICAL (sem rampa OU peça pequena OU config = primeira-passada)
        const feedCmd = estado.feedrate !== plungeRate ? ` F${plungeRate}` : '';
        let comentario = '; Mergulho vertical';

        if (!ehPrimeiraPassada && usarRampa && aplicarRampaEm === 'primeira-passada') {
          comentario = '; Mergulho vertical (rampa apenas na 1ª passada)';
        } else if (!direcao.temEspaco) {
          comentario = `; Mergulho vertical (peca < ${formatarNumero(distanciaRampa, 0)}mm)`;
        }

        gcode += incluirComentarios
          ? `G1 Z${formatarNumero(z)}${feedCmd} ${comentario}\n`
          : `G1 Z${formatarNumero(z)}${feedCmd}\n`;
        estado.posZ = z;
        if (feedCmd) estado.feedrate = plungeRate;
      }
      // NOTA: Se usar rampa, o mergulho acontece DURANTE o primeiro lado (ver abaixo)

      // === CORTE DO RETÂNGULO ===
      // Coordenadas base (dimensões programadas da peça)
      let x0 = peca.x;
      let y0 = peca.y;
      let x1 = peca.x + peca.largura;
      let y1 = peca.y + peca.altura;

      // Aplica compensação manual nas coordenadas
      if (aplicarOffset) {
        const offset = raioFerramenta;
        if (peca.tipoCorte === 'externo') {
          // Corte EXTERNO: expande o caminho para FORA (peça final = dimensões programadas)
          x0 -= offset;
          y0 -= offset;
          x1 += offset;
          y1 += offset;
        } else if (peca.tipoCorte === 'interno') {
          // Corte INTERNO: reduz o caminho para DENTRO (furo final = dimensões programadas)
          x0 += offset;
          y0 += offset;
          x1 -= offset;
          y1 -= offset;
        }
      }

      if (usarRampaNestaPeca) {
        // RAMPA INTERNA: Rampa acontece DURANTE o primeiro lado
        const feedrateRampa = calcularFeedrateRampa(feedrate, anguloRampa);

        if (direcao.usarLadoX) {
          // Rampa no lado INFERIOR (X): desce enquanto move em +X
          const xRampa = x0 + distanciaRampa;
          const feedCmd = estado.feedrate !== feedrateRampa ? ` F${feedrateRampa}` : '';

          gcode += incluirComentarios
            ? `G1 X${formatarNumero(xRampa)} Y${formatarNumero(y0)} Z${formatarNumero(z)}${feedCmd} ; Rampa interna (lado inferior)\n`
            : `G1 X${formatarNumero(xRampa)} Y${formatarNumero(y0)} Z${formatarNumero(z)}${feedCmd}\n`;
          estado.posX = xRampa;
          estado.posZ = z;
          if (feedCmd) estado.feedrate = feedrateRampa;

          // Completa o resto do lado inferior (se houver)
          if (xRampa < x1) {
            const feedCmd2 = estado.feedrate !== feedrate ? ` F${feedrate}` : '';
            gcode += incluirComentarios
              ? `G1 X${formatarNumero(x1)} Y${formatarNumero(y0)}${feedCmd2} ; Completa lado inferior\n`
              : `G1 X${formatarNumero(x1)} Y${formatarNumero(y0)}${feedCmd2}\n`;
            estado.posX = x1;
            if (feedCmd2) estado.feedrate = feedrate;
          }

          // Lado direito
          gcode += incluirComentarios
            ? `G1 X${formatarNumero(x1)} Y${formatarNumero(y1)} ; Corta lado direito\n`
            : `G1 X${formatarNumero(x1)} Y${formatarNumero(y1)}\n`;
          estado.posY = y1;

          // Lado superior
          gcode += incluirComentarios
            ? `G1 X${formatarNumero(x0)} Y${formatarNumero(y1)} ; Corta lado superior\n`
            : `G1 X${formatarNumero(x0)} Y${formatarNumero(y1)}\n`;
          estado.posX = x0;

          // Lado esquerdo (fecha)
          gcode += incluirComentarios
            ? `G1 X${formatarNumero(x0)} Y${formatarNumero(y0)} ; Corta lado esquerdo (fecha o retângulo)\n`
            : `G1 X${formatarNumero(x0)} Y${formatarNumero(y0)}\n`;
          estado.posY = y0;

        } else {
          // Rampa no lado ESQUERDO (Y): desce enquanto move em +Y
          const yRampa = y0 + distanciaRampa;
          const feedCmd = estado.feedrate !== feedrateRampa ? ` F${feedrateRampa}` : '';

          gcode += incluirComentarios
            ? `G1 X${formatarNumero(x0)} Y${formatarNumero(yRampa)} Z${formatarNumero(z)}${feedCmd} ; Rampa interna (lado esquerdo)\n`
            : `G1 X${formatarNumero(x0)} Y${formatarNumero(yRampa)} Z${formatarNumero(z)}${feedCmd}\n`;
          estado.posY = yRampa;
          estado.posZ = z;
          if (feedCmd) estado.feedrate = feedrateRampa;

          // Completa o resto do lado esquerdo (se houver)
          if (yRampa < y1) {
            const feedCmd2 = estado.feedrate !== feedrate ? ` F${feedrate}` : '';
            gcode += incluirComentarios
              ? `G1 X${formatarNumero(x0)} Y${formatarNumero(y1)}${feedCmd2} ; Completa lado esquerdo\n`
              : `G1 X${formatarNumero(x0)} Y${formatarNumero(y1)}${feedCmd2}\n`;
            estado.posY = y1;
            if (feedCmd2) estado.feedrate = feedrate;
          }

          // Lado superior
          gcode += incluirComentarios
            ? `G1 X${formatarNumero(x1)} Y${formatarNumero(y1)} ; Corta lado superior\n`
            : `G1 X${formatarNumero(x1)} Y${formatarNumero(y1)}\n`;
          estado.posX = x1;

          // Lado direito
          gcode += incluirComentarios
            ? `G1 X${formatarNumero(x1)} Y${formatarNumero(y0)} ; Corta lado direito\n`
            : `G1 X${formatarNumero(x1)} Y${formatarNumero(y0)}\n`;
          estado.posY = y0;

          // Lado inferior (fecha)
          gcode += incluirComentarios
            ? `G1 X${formatarNumero(x0)} Y${formatarNumero(y0)} ; Corta lado inferior (fecha o retângulo)\n`
            : `G1 X${formatarNumero(x0)} Y${formatarNumero(y0)}\n`;
          estado.posX = x0;
        }

      } else {
        // SEM RAMPA: Corte tradicional (4 lados na ordem normal)

        // Lado inferior
        const feedCmd1 = estado.feedrate !== feedrate ? ` F${feedrate}` : '';
        gcode += incluirComentarios
          ? `G1 X${formatarNumero(x1)} Y${formatarNumero(y0)}${feedCmd1} ; Corta lado inferior\n`
          : `G1 X${formatarNumero(x1)} Y${formatarNumero(y0)}${feedCmd1}\n`;
        estado.posX = x1;
        if (feedCmd1) estado.feedrate = feedrate;

        // Lado direito
        gcode += incluirComentarios
          ? `G1 X${formatarNumero(x1)} Y${formatarNumero(y1)} ; Corta lado direito\n`
          : `G1 X${formatarNumero(x1)} Y${formatarNumero(y1)}\n`;
        estado.posY = y1;

        // Lado superior
        gcode += incluirComentarios
          ? `G1 X${formatarNumero(x0)} Y${formatarNumero(y1)} ; Corta lado superior\n`
          : `G1 X${formatarNumero(x0)} Y${formatarNumero(y1)}\n`;
        estado.posX = x0;

        // Lado esquerdo (fecha)
        gcode += incluirComentarios
          ? `G1 X${formatarNumero(x0)} Y${formatarNumero(y0)} ; Corta lado esquerdo (fecha o retângulo)\n`
          : `G1 X${formatarNumero(x0)} Y${formatarNumero(y0)}\n`;
        estado.posY = y0;
      }
    }

    // === OVERLAP DA RAMPA ===
    // Se usou rampa em qualquer passada, precisa re-cortar TODO o lado da rampa na profundidade final
    // Isso elimina completamente a "rampa de material" que ficaria nas passadas intermediárias
    //
    // IMPORTANTE: Precisamos verificar TODAS as passadas para encontrar a maior distância de rampa,
    // pois a última passada pode ter profundidade menor (ex: 4mm) e rampa mais curta que as anteriores (6mm)
    if (usarRampa && numPassadas > 1) {
      const zFinal = -profundidade; // Profundidade final absoluta

      // Calcula a MAIOR distância de rampa possível (sempre usando profundidadePorPassada completo)
      // Isso garante que cobrimos a área da rampa mais longa
      const distanciaRampaMaior = calcularDistanciaRampa(profundidadePorPassada, anguloRampa);
      const direcaoRampa = determinarDirecaoRampa(peca, distanciaRampaMaior);

      // Só faz overlap se houve espaço para rampa (se não teve, não há área não cortada)
      if (direcaoRampa.temEspaco) {
        // Coordenadas base para overlap
        let x0Overlap = peca.x;
        let y0Overlap = peca.y;
        let x1Overlap = peca.x + peca.largura;
        let y1Overlap = peca.y + peca.altura;

        // Aplica compensação se necessário
        if (aplicarOffset) {
          const offset = raioFerramenta;
          if (peca.tipoCorte === 'externo') {
            x0Overlap -= offset;
            y0Overlap -= offset;
            x1Overlap += offset;
            y1Overlap += offset;
          } else if (peca.tipoCorte === 'interno') {
            x0Overlap += offset;
            y0Overlap += offset;
            x1Overlap -= offset;
            y1Overlap -= offset;
          }
        }

        if (incluirComentarios) {
          gcode += `\n; OVERLAP: Re-corta lado COMPLETO da rampa na profundidade final (${formatarNumero(-zFinal)}mm)\n`;
        }

        // CORREÇÃO: O overlap precisa começar do ponto inicial e ir até o final do lado
        // Isso garante que toda a área da rampa (inclusive a mais longa) seja coberta
        const feedrateNormal = feedrate;
        const feedCmd = estado.feedrate !== feedrateNormal ? ` F${feedrateNormal}` : '';

        if (direcaoRampa.usarLadoX) {
          // Overlap no lado X (inferior): re-corta TODO o lado desde o início
          // Primeiro, garante que está na posição inicial do lado da rampa
          if (estado.posX !== x0Overlap || estado.posY !== y0Overlap) {
            // Reposiciona para o início do lado (sem levantar a fresa - já está na profundidade correta)
            gcode += incluirComentarios
              ? `G1 X${formatarNumero(x0Overlap)} Y${formatarNumero(y0Overlap)} ; Reposiciona para início do overlap\n`
              : `G1 X${formatarNumero(x0Overlap)} Y${formatarNumero(y0Overlap)}\n`;
            estado.posX = x0Overlap;
            estado.posY = y0Overlap;
          }

          // Agora re-corta TODO o lado inferior na profundidade final
          gcode += incluirComentarios
            ? `G1 X${formatarNumero(x1Overlap)} Y${formatarNumero(y0Overlap)} Z${formatarNumero(zFinal)}${feedCmd} ; Overlap lado inferior completo\n`
            : `G1 X${formatarNumero(x1Overlap)} Y${formatarNumero(y0Overlap)} Z${formatarNumero(zFinal)}${feedCmd}\n`;
          estado.posX = x1Overlap;
          estado.posY = y0Overlap;
          estado.posZ = zFinal;
          if (feedCmd) estado.feedrate = feedrateNormal;
        } else {
          // Overlap no lado Y (esquerdo): re-corta TODO o lado desde o início
          // Primeiro, garante que está na posição inicial do lado da rampa
          if (estado.posX !== x0Overlap || estado.posY !== y0Overlap) {
            // Reposiciona para o início do lado (sem levantar a fresa - já está na profundidade correta)
            gcode += incluirComentarios
              ? `G1 X${formatarNumero(x0Overlap)} Y${formatarNumero(y0Overlap)} ; Reposiciona para início do overlap\n`
              : `G1 X${formatarNumero(x0Overlap)} Y${formatarNumero(y0Overlap)}\n`;
            estado.posX = x0Overlap;
            estado.posY = y0Overlap;
          }

          // Agora re-corta TODO o lado esquerdo na profundidade final
          gcode += incluirComentarios
            ? `G1 X${formatarNumero(x0Overlap)} Y${formatarNumero(y1Overlap)} Z${formatarNumero(zFinal)}${feedCmd} ; Overlap lado esquerdo completo\n`
            : `G1 X${formatarNumero(x0Overlap)} Y${formatarNumero(y1Overlap)} Z${formatarNumero(zFinal)}${feedCmd}\n`;
          estado.posX = x0Overlap;
          estado.posY = y1Overlap;
          estado.posZ = zFinal;
          if (feedCmd) estado.feedrate = feedrateNormal;
        }
      }
    }

    // Nota: Compensação manual não requer cancelamento (não usa G41/G42/G40)

    // Sobe Z uma vez ao final da peça
    gcode += incluirComentarios ? 'G0 Z5 ; Levanta fresa após completar peça\n' : 'G0 Z5\n';
    estado.posZ = 5;
    gcode += '\n';
  }

  // === FINALIZAÇÃO ===
  if (incluirComentarios) {
    gcode += '; === FIM ===\n';
  }
  gcode += incluirComentarios ? 'M5 ; Desliga o spindle\n' : 'M5\n';
  gcode += incluirComentarios ? 'G0 X0 Y0 ; Retorna para origem\n' : 'G0 X0 Y0\n';
  gcode += incluirComentarios ? 'M30 ; Fim do programa\n' : 'M30\n';

  // Remove acentuação de todos os comentários para compatibilidade
  gcode = removerAcentos(gcode);

  return gcode;
}

// ============================================================================
// FUNÇÕES AUXILIARES ADICIONAIS (migradas de gcode-generator.ts)
// ============================================================================

/**
 * Remove comentários de um código G-code
 */
export function removerComentarios(gcode: string): string {
  return gcode
    .split('\n')
    .map(linha => {
      linha = linha.replace(/\([^)]*\)/g, '');
      linha = linha.replace(/;.*$/, '');
      return linha.trim();
    })
    .filter(linha => linha.length > 0)
    .join('\n');
}

/**
 * Formata tempo em segundos para string legível (HH:MM:SS ou MM:SS)
 */
export function formatarTempo(segundos: number): string {
  if (!isFinite(segundos) || isNaN(segundos) || segundos < 0) {
    return 'N/A';
  }

  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = Math.floor(segundos % 60);

  if (horas > 0) {
    return `${horas}h ${minutos.toString().padStart(2, '0')}min ${segs.toString().padStart(2, '0')}s`;
  } else if (minutos > 0) {
    return `${minutos}min ${segs.toString().padStart(2, '0')}s`;
  } else {
    return `${segs}s`;
  }
}

/**
 * Calcula o tempo estimado de execução do G-code
 */
export function calcularTempoEstimado(
  pecasPos: PecaPosicionada[],
  _config: ConfiguracoesChapa,
  corte: ConfiguracoesCorte
): TempoEstimado {
  const { profundidade, profundidadePorPassada, feedrate, plungeRate, rapidsSpeed, usarRampa, anguloRampa, aplicarRampaEm } = corte;

  const pecasAtivas = pecasPos.filter(p => !p.ignorada);
  const rapidsSpeedSafe = rapidsSpeed || 4000;
  const numPassadas = Math.ceil(profundidade / profundidadePorPassada);

  let distanciaCorte = 0;
  let distanciaMergulho = 0;
  let distanciaRampa = 0;
  let distanciaPosicionamento = 0;

  let posX = 0;
  let posY = 0;
  let posZ = 5;

  for (const peca of pecasAtivas) {
    for (let j = 1; j <= numPassadas; j++) {
      const z = -Math.min(j * profundidadePorPassada, profundidade);
      const profundidadePassada = Math.abs(z);

      if (posX !== peca.x || posY !== peca.y) {
        if (posZ < 5) {
          distanciaPosicionamento += Math.abs(5 - posZ);
          posZ = 5;
        }
        const dx = peca.x - posX;
        const dy = peca.y - posY;
        distanciaPosicionamento += Math.sqrt(dx * dx + dy * dy);
        posX = peca.x;
        posY = peca.y;
      }

      const ehPrimeiraPassada = j === 1;
      const deveUsarRampaNaPassada = aplicarRampaEm === 'todas-passadas' || ehPrimeiraPassada;

      if (usarRampa && deveUsarRampaNaPassada) {
        const distanciaRampaNecessaria = calcularDistanciaRampa(profundidadePassada, anguloRampa);
        const direcao = determinarDirecaoRampa(peca, distanciaRampaNecessaria);
        const temEspaco = direcao.temEspaco;

        if (temEspaco) {
          const xInicio = peca.x + (direcao.deltaX * distanciaRampaNecessaria);
          const yInicio = peca.y + (direcao.deltaY * distanciaRampaNecessaria);

          if (posX !== xInicio || posY !== yInicio) {
            if (posZ < 5) {
              distanciaPosicionamento += Math.abs(5 - posZ);
              posZ = 5;
            }
            const dx = xInicio - posX;
            const dy = yInicio - posY;
            distanciaPosicionamento += Math.sqrt(dx * dx + dy * dy);
            posX = xInicio;
            posY = yInicio;
          }

          if (posZ !== 0) {
            distanciaMergulho += Math.abs(posZ);
            posZ = 0;
          }

          const dx = peca.x - xInicio;
          const dy = peca.y - yInicio;
          const dz = z - posZ;
          distanciaRampa += Math.sqrt(dx * dx + dy * dy + dz * dz);
          posX = peca.x;
          posY = peca.y;
          posZ = z;
        } else {
          if (posZ !== z) {
            distanciaMergulho += Math.abs(z - posZ);
            posZ = z;
          }
        }
      } else {
        if (posZ !== z) {
          distanciaMergulho += Math.abs(z - posZ);
          posZ = z;
        }
      }

      const perimetro = 2 * (peca.largura + peca.altura);
      distanciaCorte += perimetro;

      if (j === numPassadas) {
        if (posZ < 5) {
          distanciaPosicionamento += Math.abs(5 - posZ);
          posZ = 5;
        }
      }
    }
  }

  if (posX !== 0 || posY !== 0) {
    distanciaPosicionamento += Math.sqrt(posX * posX + posY * posY);
    posX = 0;
    posY = 0;
  }

  const tempoCorte = (distanciaCorte / feedrate) * 60;
  const tempoMergulho = (distanciaMergulho / plungeRate) * 60;
  const feedrateRampa = usarRampa ? calcularFeedrateRampa(feedrate, anguloRampa) : feedrate;
  const tempoRampa = (distanciaRampa / feedrateRampa) * 60;
  const tempoPosicionamento = (distanciaPosicionamento / rapidsSpeedSafe) * 60;
  const tempoTotal = tempoCorte + tempoMergulho + tempoRampa + tempoPosicionamento;
  const distanciaTotal = distanciaCorte + distanciaMergulho + distanciaRampa + distanciaPosicionamento;

  return {
    tempoCorte,
    tempoMergulho: tempoMergulho + tempoRampa,
    tempoPosicionamento,
    tempoTotal,
    distanciaCorte,
    distanciaMergulho: distanciaMergulho + distanciaRampa,
    distanciaPosicionamento,
    distanciaTotal
  };
}
