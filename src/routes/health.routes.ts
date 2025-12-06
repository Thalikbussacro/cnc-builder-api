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

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check básico
 *     description: |
 *       Endpoint simples para load balancers e monitoramento básico.
 *       Sempre retorna status 200 se o serviço está rodando.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Serviço está rodando
 *         headers:
 *           X-Request-ID:
 *             $ref: '#/components/headers/X-Request-ID'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 */
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Health check detalhado com métricas do sistema
 *     description: |
 *       Retorna informações completas sobre o estado do serviço:
 *       - Status (healthy, degraded, unhealthy)
 *       - Uptime do processo
 *       - Uso de CPU e memória
 *       - Load average do sistema
 *       - Estatísticas de cache (se disponível)
 *
 *       **Critérios de Status:**
 *       - `healthy`: CPU < 75% e Memória < 75%
 *       - `degraded`: CPU 75-90% ou Memória 75-90%
 *       - `unhealthy`: CPU > 90% ou Memória > 90% (retorna 503)
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Serviço está saudável ou degradado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-12-06T01:30:00.000Z"
 *                 uptime:
 *                   type: number
 *                   description: Tempo de execução em segundos
 *                   example: 3600.5
 *                 system:
 *                   type: object
 *                   properties:
 *                     platform:
 *                       type: string
 *                       example: "linux x64"
 *                     nodeVersion:
 *                       type: string
 *                       example: "v20.10.0"
 *                     cpuUsage:
 *                       type: number
 *                       description: Uso de CPU em porcentagem
 *                       example: 45.23
 *                     memoryUsage:
 *                       type: object
 *                       properties:
 *                         used:
 *                           type: number
 *                           description: Memória usada em MB
 *                           example: 256
 *                         total:
 *                           type: number
 *                           description: Memória total em MB
 *                           example: 1024
 *                         percentage:
 *                           type: number
 *                           description: Porcentagem de uso
 *                           example: 25.0
 *                     loadAverage:
 *                       type: array
 *                       items:
 *                         type: number
 *                       description: Load average do sistema (1, 5, 15 min)
 *                       example: [0.5, 0.6, 0.7]
 *                 cache:
 *                   type: object
 *                   description: Estatísticas de cache (opcional)
 *                   properties:
 *                     keys:
 *                       type: number
 *                       example: 42
 *                     hits:
 *                       type: number
 *                       example: 150
 *                     misses:
 *                       type: number
 *                       example: 50
 *                     hitRate:
 *                       type: number
 *                       description: Taxa de acerto em porcentagem
 *                       example: 75.0
 *       503:
 *         description: Serviço está unhealthy (CPU ou memória > 90%)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "unhealthy"
 */
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

/**
 * @swagger
 * /ready:
 *   get:
 *     summary: Readiness probe (Kubernetes)
 *     description: |
 *       Indica se o serviço está pronto para receber tráfego.
 *       Usado pelo Kubernetes para determinar quando rotear requests.
 *
 *       Este endpoint pode ser estendido para verificar:
 *       - Conexão com banco de dados
 *       - Conexão com serviços externos
 *       - Warm-up de caches
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Serviço está pronto para receber tráfego
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                   example: true
 *       503:
 *         description: Serviço não está pronto (não rotear tráfego)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                   example: false
 */
router.get('/ready', (_req, res) => {
  // Verificar dependências críticas aqui (DB, etc)
  const ready = true;
  res.status(ready ? 200 : 503).json({ ready });
});

/**
 * @swagger
 * /live:
 *   get:
 *     summary: Liveness probe (Kubernetes)
 *     description: |
 *       Indica se o processo está vivo e funcionando.
 *       Usado pelo Kubernetes para determinar quando reiniciar o container.
 *
 *       Deve responder rapidamente e não fazer verificações complexas.
 *       Se este endpoint falhar, o container será reiniciado.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Processo está vivo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alive:
 *                   type: boolean
 *                   example: true
 */
router.get('/live', (_req, res) => {
  res.json({ alive: true });
});

export default router;
