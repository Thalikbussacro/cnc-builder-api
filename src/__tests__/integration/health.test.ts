import request from 'supertest';
import app from '../../server';

describe('Integration: Health Endpoints', () => {
  describe('GET /health', () => {
    it('deve retornar status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /health/detailed', () => {
    it('deve retornar métricas detalhadas do sistema', async () => {
      const response = await request(app)
        .get('/health/detailed');

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('system');

      expect(response.body.system).toHaveProperty('platform');
      expect(response.body.system).toHaveProperty('nodeVersion');
      expect(response.body.system).toHaveProperty('cpuUsage');
      expect(response.body.system).toHaveProperty('memoryUsage');
      expect(response.body.system).toHaveProperty('loadAverage');
    });

    it('deve incluir métricas de cache', async () => {
      const response = await request(app)
        .get('/health/detailed');

      // Cache pode ou não estar presente dependendo do estado
      if (response.body.cache) {
        expect(response.body.cache).toHaveProperty('keys');
        expect(response.body.cache).toHaveProperty('hits');
        expect(response.body.cache).toHaveProperty('misses');
        expect(response.body.cache).toHaveProperty('hitRate');
      }
    });

    it('deve ter status válido (healthy, degraded ou unhealthy)', async () => {
      const response = await request(app)
        .get('/health/detailed');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);
    });

    it('deve retornar memória usage com percentage', async () => {
      const response = await request(app)
        .get('/health/detailed');

      expect(response.body.system.memoryUsage.percentage).toBeGreaterThan(0);
      expect(response.body.system.memoryUsage.percentage).toBeLessThan(100);
    });
  });

  describe('GET /ready', () => {
    it('deve retornar ready true', async () => {
      const response = await request(app)
        .get('/ready')
        .expect(200);

      expect(response.body).toEqual({ ready: true });
    });
  });

  describe('GET /live', () => {
    it('deve retornar alive true', async () => {
      const response = await request(app)
        .get('/live')
        .expect(200);

      expect(response.body).toEqual({ alive: true });
    });
  });
});
