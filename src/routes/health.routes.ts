import { Router } from 'express';
import os from 'os';

const router = Router();
const startTime = Date.now();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  system: {
    platform: string;
    nodeVersion: string;
    cpuUsage: number;
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    loadAverage: number[];
  };
  cache?: {
    keys: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
}

// Health check básico (para load balancers)
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Health check detalhado
router.get('/health/detailed', async (_req, res) => {
  const uptime = (Date.now() - startTime) / 1000;
  const totalMem = os.totalmem();
  const usedMem = totalMem - os.freemem();

  // Calcular CPU usage
  const cpuUsage = process.cpuUsage();
  const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000 / uptime * 100;

  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime,
    system: {
      platform: `${os.platform()} ${os.arch()}`,
      nodeVersion: process.version,
      cpuUsage: Math.round(cpuPercent * 100) / 100,
      memoryUsage: {
        used: Math.round(usedMem / 1024 / 1024),
        total: Math.round(totalMem / 1024 / 1024),
        percentage: Math.round((usedMem / totalMem) * 100 * 100) / 100,
      },
      loadAverage: os.loadavg(),
    },
  };

  // Adicionar stats de cache se disponível
  try {
    const { getCacheStats } = await import('../services/cache');
    const stats = getCacheStats();
    health.cache = {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits / (stats.hits + stats.misses) * 100 || 0,
    };
  } catch {
    // Cache não disponível
  }

  // Determinar status
  if (health.system.memoryUsage.percentage > 90 || health.system.cpuUsage > 90) {
    health.status = 'unhealthy';
    res.status(503);
  } else if (health.system.memoryUsage.percentage > 75 || health.system.cpuUsage > 75) {
    health.status = 'degraded';
  }

  res.json(health);
});

// Readiness check (para Kubernetes)
router.get('/ready', (_req, res) => {
  // Verificar dependências críticas aqui (DB, etc)
  const ready = true;
  res.status(ready ? 200 : 503).json({ ready });
});

// Liveness check (para Kubernetes)
router.get('/live', (_req, res) => {
  res.json({ alive: true });
});

export default router;
