import NodeCache from 'node-cache';

/**
 * Cache de validações
 * TTL: 5 minutos
 * Max keys: 1000 configs
 */
export const validationCache = new NodeCache({
  stdTTL: 300, // 5 minutos
  checkperiod: 60, // Verifica items expirados a cada 1 minuto
  maxKeys: 1000, // Máximo 1000 configs em cache
  useClones: false, // Performance (não clona objetos)
});

/**
 * Gera chave de cache a partir dos dados
 */
export function getCacheKey(data: any): string {
  return JSON.stringify(data);
}

/**
 * Retorna estatísticas do cache
 */
export function getCacheStats() {
  return validationCache.getStats();
}
