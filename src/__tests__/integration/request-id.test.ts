import request from 'supertest';
import app from '../../server';

describe('Integration: Request ID', () => {
  describe('Geração automática de Request ID', () => {
    it('deve adicionar X-Request-ID no header de resposta', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-request-id']).toBeDefined();
      expect(typeof response.headers['x-request-id']).toBe('string');
      expect(response.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('deve gerar request IDs únicos para cada requisição', async () => {
      const response1 = await request(app).get('/health');
      const response2 = await request(app).get('/health');

      expect(response1.headers['x-request-id']).not.toBe(
        response2.headers['x-request-id']
      );
    });
  });

  describe('Request ID fornecido pelo cliente', () => {
    it('deve aceitar X-Request-ID customizado do cliente', async () => {
      const customId = 'my-custom-request-id';

      const response = await request(app)
        .get('/health')
        .set('X-Request-ID', customId);

      expect(response.headers['x-request-id']).toBe(customId);
    });

    it('deve propagar request ID em todas as rotas', async () => {
      const customId = 'test-request-123';

      // Testar em diferentes endpoints
      const healthResponse = await request(app)
        .get('/health')
        .set('X-Request-ID', customId);

      const detailedResponse = await request(app)
        .get('/health/detailed')
        .set('X-Request-ID', customId);

      expect(healthResponse.headers['x-request-id']).toBe(customId);
      expect(detailedResponse.headers['x-request-id']).toBe(customId);
    });
  });

  describe('Request ID em rotas da API', () => {
    it('deve funcionar em POST /api/gcode/validate', async () => {
      const response = await request(app)
        .post('/api/gcode/validate')
        .send({
          pecas: [{ largura: 100, altura: 100, tipoCorte: 'externo', id: '1' }],
        });

      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('deve funcionar em POST /api/gcode/generate', async () => {
      const response = await request(app)
        .post('/api/gcode/generate')
        .send({
          pecas: [{ largura: 100, altura: 100, tipoCorte: 'externo', id: '1' }],
        });

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });
});
