/**
 * Regras de validação para parâmetros de corte CNC
 *
 * IMPORTANTE: Estes valores podem ser ajustados conforme necessário.
 * Cada regra define limites mínimos, máximos e valores recomendados.
 */

export const VALIDATION_RULES = {
  // ========================================================================
  // PROFUNDIDADE
  // ========================================================================
  profundidade: {
    min: 0.1,           // mm - Mínimo técnico
    max: 50,            // mm - Máximo razoável para CNC comum
    recomendadoMin: 1,  // mm - Mínimo recomendado
    recomendadoMax: 30, // mm - Máximo recomendado
  },

  // ========================================================================
  // PROFUNDIDADE POR PASSADA
  // ========================================================================
  profundidadePorPassada: {
    min: 0.1,           // mm - Mínimo técnico
    max: 10,            // mm - Máximo razoável
    recomendadoMin: 0.5,  // mm - Mínimo recomendado
    recomendadoMax: 5,    // mm - Máximo recomendado (depende do material)
    // Relação com diâmetro da fresa (profundidade < X% do diâmetro)
    maxPercentualDiametro: 50, // % - Avisar se > 50% do diâmetro
  },

  // ========================================================================
  // ESPAÇAMENTO ENTRE PEÇAS
  // ========================================================================
  espacamento: {
    min: 0,             // mm - Pode ser zero (peças coladas)
    max: 500,           // mm - Máximo razoável
    recomendadoMin: 10, // mm - Mínimo recomendado (margem de segurança)
    recomendadoMax: 100,// mm - Máximo recomendado
  },

  // ========================================================================
  // FEEDRATE (Velocidade de avanço)
  // ========================================================================
  feedrate: {
    min: 50,            // mm/min - Mínimo técnico
    max: 5000,          // mm/min - Máximo razoável
    recomendadoMin: 500,  // mm/min - Mínimo recomendado
    recomendadoMax: 3000, // mm/min - Máximo recomendado (materiais duros)
  },

  // ========================================================================
  // PLUNGE RATE (Velocidade de mergulho)
  // ========================================================================
  plungeRate: {
    min: 50,            // mm/min - Mínimo técnico
    max: 2000,          // mm/min - Máximo razoável
    recomendadoMin: 100,  // mm/min - Mínimo recomendado
    recomendadoMax: 1000, // mm/min - Máximo recomendado
    // Relação com feedrate (plunge = X% a Y% do feedrate)
    percentualFeedrateMin: 20, // % - Mínimo recomendado
    percentualFeedrateMax: 70, // % - Máximo recomendado
  },

  // ========================================================================
  // RAPIDS SPEED (Velocidade de movimento rápido)
  // ========================================================================
  rapidsSpeed: {
    min: 500,           // mm/min - Mínimo técnico
    max: 15000,         // mm/min - Máximo razoável
    recomendadoMin: 2000,  // mm/min - Mínimo recomendado
    recomendadoMax: 10000, // mm/min - Máximo recomendado
  },

  // ========================================================================
  // SPINDLE SPEED (Rotação do spindle)
  // ========================================================================
  spindleSpeed: {
    min: 1000,          // RPM - Mínimo técnico
    max: 30000,         // RPM - Máximo razoável
    recomendadoMin: 10000,  // RPM - Mínimo recomendado
    recomendadoMax: 24000,  // RPM - Máximo recomendado
  },

  // ========================================================================
  // ÂNGULO DA RAMPA
  // ========================================================================
  anguloRampa: {
    min: 1,             // graus - Mínimo técnico
    max: 10,            // graus - Máximo razoável
    recomendadoMin: 2,  // graus - Mínimo recomendado (conservador)
    recomendadoMax: 5,  // graus - Máximo recomendado (equilibrado)
    avisoConservador: 2, // graus - Avisar se < 2° (rampa muito longa)
    avisoAgressivo: 5,   // graus - Avisar se > 5° (rampa agressiva)
  },

  // ========================================================================
  // DIÂMETRO DA FRESA
  // ========================================================================
  diametroFresa: {
    min: 1,             // mm - Mínimo técnico
    max: 25,            // mm - Máximo razoável
    recomendadoMin: 3,  // mm - Mínimo recomendado
    recomendadoMax: 12, // mm - Máximo recomendado
  },

  // ========================================================================
  // ESPESSURA DA CHAPA
  // ========================================================================
  espessuraChapa: {
    min: 0.5,           // mm - Mínimo técnico
    max: 50,            // mm - Máximo razoável
    recomendadoMin: 3,  // mm - Mínimo recomendado
    recomendadoMax: 30, // mm - Máximo recomendado
  },
} as const;

/**
 * Mensagens de erro/aviso padronizadas
 */
export const VALIDATION_MESSAGES = {
  // Erros críticos
  profundidadeZero: 'Profundidade não pode ser zero ou negativa',
  profundidadePassadaZero: 'Profundidade por passada não pode ser zero ou negativa',
  profundidadePassadaMaiorQueTotal: 'Profundidade por passada não pode ser maior que profundidade total',
  feedrateZero: 'Velocidade de avanço não pode ser zero',
  plungeRateZero: 'Velocidade de mergulho não pode ser zero',
  spindleSpeedZero: 'Rotação do spindle não pode ser zero',
  diametroFresaZero: 'Diâmetro da fresa não pode ser zero',
  nenhumaPecaAdicionada: 'Nenhuma peça foi adicionada',
  nenhumaPecaPosicionada: 'Nenhuma peça coube na chapa',
  todasPecasPequenasParaRampa: 'Todas as peças são pequenas demais para rampa',

  // Avisos
  plungeRateMaiorQueFeedrate: 'Velocidade de mergulho está maior que velocidade de avanço',
  profundidadeMaiorQueEspessura: 'Profundidade de corte é maior que espessura da chapa',
  feedrateMuitoAlto: 'Velocidade de avanço muito alta para materiais duros',
  spindleSpeedMuitoBaixo: 'Rotação do spindle está muito baixa',
  anguloRampaConservador: 'Ângulo da rampa muito baixo (rampa será muito longa)',
  anguloRampaAgressivo: 'Ângulo da rampa agressivo (pode estressar a ferramenta)',
  algumasPecasPequenasParaRampa: 'Algumas peças usarão mergulho vertical (tamanho insuficiente para rampa)',
} as const;
