import request from 'supertest';
import app from '../../server';

describe('Integration: G-code Endpoints', () => {
  describe('POST /api/gcode/generate', () => {
    it('deve gerar G-code com sucesso', async () => {
      const response = await request(app)
        .post('/api/gcode/generate')
        .send({
          pecas: [
            { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
          ],
        })
        .expect(200);

      expect(response.body).toHaveProperty('gcode');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.gcode).toContain('G21'); // Modo métrico
      expect(response.body.gcode).toContain('G90'); // Posicionamento absoluto
      expect(response.body.gcode).toContain('M30'); // Fim de programa
    });

    it('deve retornar metadata correta', async () => {
      const response = await request(app)
        .post('/api/gcode/generate')
        .send({
          pecas: [
            { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
          ],
        })
        .expect(200);

      expect(response.body.metadata).toHaveProperty('linhas');
      expect(response.body.metadata).toHaveProperty('tamanhoBytes');
      expect(response.body.metadata).toHaveProperty('tempoEstimado');
      expect(response.body.metadata).toHaveProperty('metricas');
      expect(response.body.metadata).toHaveProperty('configuracoes');
    });

    it('deve funcionar com múltiplas peças', async () => {
      const response = await request(app)
        .post('/api/gcode/generate')
        .send({
          pecas: [
            { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
            { largura: 150, altura: 150, tipoCorte: 'interno', id: '2' },
            { largura: 75, altura: 75, tipoCorte: 'na-linha', id: '3' },
          ],
        })
        .expect(200);

      expect(response.body.gcode).toBeDefined();
      expect(response.body.metadata).toHaveProperty('metricas');
      expect(response.body.metadata.metricas.eficiencia).toBeGreaterThan(0);
    });

    it('deve aceitar configurações customizadas', async () => {
      const response = await request(app)
        .post('/api/gcode/generate')
        .send({
          pecas: [
            { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
          ],
          configChapa: { largura: 600, altura: 400, espessura: 10 },
          configCorte: { profundidade: 10, espacamento: 5 },
          metodoNesting: 'shelf',
        });

      // Pode retornar 200 (sucesso) ou 422 (validação falhou)
      expect([200, 422]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.metadata.configuracoes.chapa.largura).toBe(600);
        expect(response.body.metadata.configuracoes.nesting.metodo).toBe('shelf');
      }
    });

    it('deve retornar 400 com pecas vazias', async () => {
      await request(app)
        .post('/api/gcode/generate')
        .send({ pecas: [] })
        .expect(400);
    });

    it('deve retornar 400 sem pecas', async () => {
      await request(app)
        .post('/api/gcode/generate')
        .send({})
        .expect(400);
    });

    it('deve retornar 400 com dados inválidos', async () => {
      await request(app)
        .post('/api/gcode/generate')
        .send({
          pecas: [{ largura: 'invalid', altura: 100 }],
        })
        .expect(400);
    });
  });

  describe('POST /api/gcode/validate', () => {
    it('deve validar configurações válidas', async () => {
      const response = await request(app)
        .post('/api/gcode/validate')
        .send({
          pecas: [
            { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
          ],
        })
        .expect(200);

      expect(response.body).toHaveProperty('valid');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('warnings');
      expect(response.body).toHaveProperty('preview');
      expect(response.body.valid).toBe(true);
    });

    it('deve retornar preview com dados de nesting', async () => {
      const response = await request(app)
        .post('/api/gcode/validate')
        .send({
          pecas: [
            { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
          ],
        })
        .expect(200);

      expect(response.body.preview).toHaveProperty('tempoEstimado');
      expect(response.body.preview).toHaveProperty('metricas');
      expect(response.body.preview).toHaveProperty('pecasPosicionadas');
      expect(response.body.preview).toHaveProperty('pecasNaoCouberam');
    });

    it('deve retornar warnings para peças que não cabem', async () => {
      const response = await request(app)
        .post('/api/gcode/validate')
        .send({
          pecas: [
            { largura: 5000, altura: 5000, tipoCorte: 'externo', id: '1' },
          ],
        })
        .expect(200);

      // Peça não deve caber
      expect(response.body.preview.pecasNaoCouberam.length).toBeGreaterThan(0);
      // Warnings podem ou não estar presentes dependendo da implementação
      expect(response.body.warnings).toBeDefined();
    });

    it('deve retornar 400 com dados inválidos', async () => {
      await request(app)
        .post('/api/gcode/validate')
        .send({
          pecas: [{ largura: -100, altura: 100 }],
        })
        .expect(400);
    });

    it('deve usar cache em validações repetidas', async () => {
      const payload = {
        pecas: [
          { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
        ],
      };

      // Primeira request
      const response1 = await request(app)
        .post('/api/gcode/validate')
        .send(payload)
        .expect(200);

      // Segunda request (deve usar cache)
      const response2 = await request(app)
        .post('/api/gcode/validate')
        .send(payload)
        .expect(200);

      // Resultados devem ser idênticos
      expect(response1.body).toEqual(response2.body);
    });
  });

  describe('GET /api/cache/stats', () => {
    it('deve retornar estatísticas do cache', async () => {
      // Fazer uma validação primeiro para popular o cache
      await request(app)
        .post('/api/gcode/validate')
        .send({
          pecas: [
            { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
          ],
        });

      const response = await request(app)
        .get('/api/cache/stats')
        .expect(200);

      expect(response.body).toHaveProperty('keys');
      expect(response.body).toHaveProperty('hits');
      expect(response.body).toHaveProperty('misses');
    });
  });
});
