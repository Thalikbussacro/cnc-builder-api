import type { ConfiguracoesChapa, ConfiguracoesCorte, ConfiguracoesFerramenta } from '../types';

export const DEFAULT_CONFIG_CHAPA: ConfiguracoesChapa = {
  largura: 2850,
  altura: 1500,
  espessura: 15,
};

export const DEFAULT_CONFIG_CORTE: ConfiguracoesCorte = {
  profundidade: 15,
  espacamento: 50,
  profundidadePorPassada: 4,
  feedrate: 1500,
  plungeRate: 500,
  rapidsSpeed: 4000,
  spindleSpeed: 18000,
  usarRampa: false,
  tipoRampa: 'linear',
  anguloRampa: 3,
  aplicarRampaEm: 'primeira-passada',
  zigZagAmplitude: 2,
  zigZagPitch: 5,
  maxRampStepZ: 0.5,
  usarMesmoEspacamentoBorda: true,
  margemBorda: 50,
};

export const DEFAULT_CONFIG_FERRAMENTA: ConfiguracoesFerramenta = {
  diametro: 6,
  numeroFerramenta: 1,
};

/**
 * Mescla configurações fornecidas com defaults
 */
export function mergeWithDefaults<T>(partial: Partial<T>, defaults: T): T {
  return { ...defaults, ...partial };
}
