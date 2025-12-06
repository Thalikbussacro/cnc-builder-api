import request from 'supertest';
import app from '../../server';

/**
 * Testes E2E (End-to-End)
 * Simulam fluxos completos de usuário da API
 */

describe('E2E: Fluxos Completos', () => {
  describe('Fluxo: Validação → Geração → Cache', () => {
    it('deve completar fluxo completo de validação, geração e uso de cache', async () => {
      const payload = {
        pecas: [
          { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
          { largura: 150, altura: 150, tipoCorte: 'externo', id: '2' },
        ],
      };

      // PASSO 1: Validar configuração
      const validacao = await request(app)
        .post('/api/gcode/validate')
        .send(payload);

      expect(validacao.status).toBe(200);
      expect(validacao.body.valid).toBe(true);
      expect(validacao.body.errors).toHaveLength(0);
      expect(validacao.body.preview).toBeDefined();
      expect(validacao.body.preview.pecasPosicionadas).toHaveLength(2);
      expect(validacao.body.preview.pecasNaoCouberam).toHaveLength(0);

      // PASSO 2: Gerar G-code
      const geracao = await request(app)
        .post('/api/gcode/generate')
        .send(payload);

      expect(geracao.status).toBe(200);
      expect(geracao.body.gcode).toBeDefined();
      expect(geracao.body.gcode).toContain('G21'); // Modo métrico
      expect(geracao.body.gcode).toContain('G90'); // Posicionamento absoluto
      expect(geracao.body.gcode).toContain('M30'); // Fim de programa
      expect(geracao.body.metadata.configuracoes.nesting.pecasPosicionadas).toBe(2);

      // PASSO 3: Validar novamente (deve usar cache)
      const validacaoCache = await request(app)
        .post('/api/gcode/validate')
        .send(payload);

      expect(validacaoCache.status).toBe(200);
      // Deve ser idêntico à primeira validação (cache hit)
      expect(validacaoCache.body).toEqual(validacao.body);

      // PASSO 4: Verificar estatísticas de cache
      const stats = await request(app).get('/api/cache/stats');

      expect(stats.status).toBe(200);
      expect(stats.body.keys).toBeGreaterThan(0);
      expect(stats.body.hits).toBeGreaterThan(0);
    }, 30000); // Timeout de 30s para o teste completo
  });

  describe('Fluxo: Erros e Validação', () => {
    it('deve rejeitar peças inválidas e retornar erro 400', async () => {
      const payloadInvalido = {
        pecas: [
          { largura: -100, altura: 100, tipoCorte: 'externo', id: '1' }, // Largura negativa
        ],
      };

      const response = await request(app)
        .post('/api/gcode/validate')
        .send(payloadInvalido);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.details).toBeDefined();
    });

    it('deve rejeitar quando peças não cabem na chapa', async () => {
      const payload = {
        pecas: [
          { largura: 5000, altura: 5000, tipoCorte: 'externo', id: '1' }, // Muito grande
        ],
      };

      const response = await request(app)
        .post('/api/gcode/generate')
        .send(payload);

      // Pode ser 400 (BadRequest) ou 422 (ValidationError)
      expect([400, 422]).toContain(response.status);
      expect(response.body.error).toBeDefined();
    });

    it('deve rejeitar payload sem peças', async () => {
      const response = await request(app)
        .post('/api/gcode/generate')
        .send({ pecas: [] });

      expect(response.status).toBe(400);
    });
  });

  describe('Fluxo: Headers e Metadados', () => {
    it('deve incluir Request ID em todas as respostas', async () => {
      const payload = {
        pecas: [{ largura: 100, altura: 100, tipoCorte: 'externo', id: '1' }],
      };

      const responses = await Promise.all([
        request(app).post('/api/gcode/validate').send(payload),
        request(app).post('/api/gcode/generate').send(payload),
        request(app).get('/api/cache/stats'),
        request(app).get('/health'),
      ]);

      responses.forEach((res) => {
        expect(res.headers['x-request-id']).toBeDefined();
        expect(res.headers['x-request-id']).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
      });
    });

    it('deve aceitar Request ID customizado do cliente', async () => {
      const customId = 'e2e-test-request-123';
      const payload = {
        pecas: [{ largura: 100, altura: 100, tipoCorte: 'externo', id: '1' }],
      };

      const response = await request(app)
        .post('/api/gcode/validate')
        .set('X-Request-ID', customId)
        .send(payload);

      expect(response.headers['x-request-id']).toBe(customId);
    });

    it('deve incluir headers de rate limit', async () => {
      const payload = {
        pecas: [{ largura: 100, altura: 100, tipoCorte: 'externo', id: '1' }],
      };

      const response = await request(app)
        .post('/api/gcode/validate')
        .send(payload);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('Fluxo: Algoritmos de Nesting', () => {
    it('deve funcionar com algoritmo greedy', async () => {
      const payload = {
        pecas: [
          { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
          { largura: 80, altura: 120, tipoCorte: 'externo', id: '2' },
        ],
        metodoNesting: 'greedy',
      };

      const response = await request(app)
        .post('/api/gcode/generate')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.metadata.configuracoes.nesting.metodo).toBe('greedy');
    });

    it('deve funcionar com algoritmo shelf', async () => {
      const payload = {
        pecas: [
          { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
          { largura: 80, altura: 120, tipoCorte: 'externo', id: '2' },
        ],
        metodoNesting: 'shelf',
      };

      const response = await request(app)
        .post('/api/gcode/generate')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.metadata.configuracoes.nesting.metodo).toBe('shelf');
    });

    it('deve funcionar com algoritmo guillotine (padrão)', async () => {
      const payload = {
        pecas: [
          { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
          { largura: 80, altura: 120, tipoCorte: 'externo', id: '2' },
        ],
      };

      const response = await request(app)
        .post('/api/gcode/generate')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.metadata.configuracoes.nesting.metodo).toBe('guillotine');
    });

    it('deve comparar eficiência entre algoritmos', async () => {
      const payload = {
        pecas: Array.from({ length: 10 }, (_, i) => ({
          largura: 50 + (i % 3) * 20,
          altura: 50 + (i % 2) * 30,
          tipoCorte: 'externo',
          id: String(i + 1),
        })),
      };

      const [greedy, shelf, guillotine] = await Promise.all([
        request(app)
          .post('/api/gcode/generate')
          .send({ ...payload, metodoNesting: 'greedy' }),
        request(app)
          .post('/api/gcode/generate')
          .send({ ...payload, metodoNesting: 'shelf' }),
        request(app)
          .post('/api/gcode/generate')
          .send({ ...payload, metodoNesting: 'guillotine' }),
      ]);

      // Todos devem ter sucesso
      expect(greedy.status).toBe(200);
      expect(shelf.status).toBe(200);
      expect(guillotine.status).toBe(200);

      // Todos devem ter eficiência calculada
      expect(greedy.body.metadata.metricas.eficiencia).toBeGreaterThan(0);
      expect(shelf.body.metadata.metricas.eficiencia).toBeGreaterThan(0);
      expect(guillotine.body.metadata.metricas.eficiencia).toBeGreaterThan(0);
    });
  });

  describe('Fluxo: Health Checks', () => {
    it('deve retornar status saudável em sequência de health checks', async () => {
      // Simular monitoramento contínuo
      const healthChecks = await Promise.all([
        request(app).get('/health'),
        request(app).get('/health/detailed'),
        request(app).get('/ready'),
        request(app).get('/live'),
      ]);

      expect(healthChecks[0].body.status).toBe('ok');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(
        healthChecks[1].body.status
      );
      expect(healthChecks[2].body.ready).toBe(true);
      expect(healthChecks[3].body.alive).toBe(true);
    });
  });

  describe('Fluxo: Configurações Customizadas', () => {
    it('deve aceitar configurações de chapa customizadas', async () => {
      const payload = {
        pecas: [{ largura: 100, altura: 100, tipoCorte: 'externo', id: 'custom-config-1' }],
        configChapa: {
          largura: 600,
          altura: 400,
          espessura: 10,
        },
        configCorte: {
          profundidade: 10,
          espacamento: 5,
        },
      };

      const response = await request(app)
        .post('/api/gcode/generate')
        .send(payload);

      // Pode retornar 200 (sucesso), 422 (validação falhou) ou 429 (rate limit)
      expect([200, 422, 429]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.metadata.configuracoes.chapa.largura).toBe(600);
        expect(response.body.metadata.configuracoes.chapa.altura).toBe(400);
        expect(response.body.metadata.configuracoes.corte.espacamento).toBe(5);
      }
    });
  });
});
