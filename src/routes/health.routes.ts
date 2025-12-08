import { Router } from 'express';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check básico
 *     description: |
 *       Endpoint simples para monitoramento.
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

export default router;
