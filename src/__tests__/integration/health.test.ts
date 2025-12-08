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

    it('deve incluir header X-Request-ID', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });
});
