import NodeCache from 'node-cache';

export const validationCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  maxKeys: 1000,
  useClones: false,
});

export function getCacheKey(data: any): string {
  return JSON.stringify(data);
}

export function getCacheStats() {
  return validationCache.getStats();
}
