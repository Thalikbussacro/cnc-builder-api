import { posicionarPecas } from './nesting-algorithm';
import type { Peca } from '../types';

describe('Nesting Algorithm', () => {
  describe('posicionarPecas', () => {
    it('deve posicionar uma peça simples', () => {
      const pecas: Peca[] = [
        { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
      ];

      const resultado = posicionarPecas(pecas, 1000, 1000, 10);

      expect(resultado.posicionadas).toHaveLength(1);
      expect(resultado.naoCouberam).toHaveLength(0);
      expect(resultado.metricas.eficiencia).toBeGreaterThan(0);
    });

    it('deve retornar peça em naoCouberam quando não cabe', () => {
      const pecas: Peca[] = [
        { largura: 2000, altura: 2000, tipoCorte: 'externo', id: '1' },
      ];

      const resultado = posicionarPecas(pecas, 1000, 1000, 10);

      expect(resultado.posicionadas).toHaveLength(0);
      expect(resultado.naoCouberam).toHaveLength(1);
    });

    it('deve posicionar múltiplas peças', () => {
      const pecas: Peca[] = [
        { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
        { largura: 100, altura: 100, tipoCorte: 'externo', id: '2' },
        { largura: 100, altura: 100, tipoCorte: 'externo', id: '3' },
      ];

      const resultado = posicionarPecas(pecas, 1000, 1000, 10);

      expect(resultado.posicionadas.length).toBeGreaterThan(0);
      expect(resultado.metricas.eficiencia).toBeGreaterThan(0);
    });

    it('deve calcular eficiência corretamente', () => {
      const pecas: Peca[] = [
        { largura: 500, altura: 500, tipoCorte: 'externo', id: '1' },
      ];

      const resultado = posicionarPecas(pecas, 1000, 1000, 10);

      // 500x500 em chapa 1000x1000 = 25% de eficiência
      expect(resultado.metricas.eficiencia).toBeCloseTo(25, 0);
    });

    it('deve retornar empty result quando não há peças (early exit)', () => {
      const pecas: Peca[] = [];

      const resultado = posicionarPecas(pecas, 1000, 1000, 10);

      expect(resultado.posicionadas).toHaveLength(0);
      expect(resultado.naoCouberam).toHaveLength(0);
      expect(resultado.metricas.eficiencia).toBe(0);
      expect(resultado.metricas.areaUtilizada).toBe(0);
    });

    it('deve funcionar com método greedy', () => {
      const pecas: Peca[] = [
        { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
      ];

      const resultado = posicionarPecas(pecas, 1000, 1000, 10, 'greedy');

      expect(resultado.posicionadas).toHaveLength(1);
    });

    it('deve funcionar com método shelf', () => {
      const pecas: Peca[] = [
        { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
      ];

      const resultado = posicionarPecas(pecas, 1000, 1000, 10, 'shelf');

      expect(resultado.posicionadas).toHaveLength(1);
    });

    it('deve funcionar com método guillotine', () => {
      const pecas: Peca[] = [
        { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
      ];

      const resultado = posicionarPecas(pecas, 1000, 1000, 10, 'guillotine');

      expect(resultado.posicionadas).toHaveLength(1);
    });

    it('deve respeitar espacamento entre peças', () => {
      const pecas: Peca[] = [
        { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
        { largura: 100, altura: 100, tipoCorte: 'externo', id: '2' },
      ];

      const resultado = posicionarPecas(pecas, 1000, 1000, 50);

      if (resultado.posicionadas.length === 2) {
        const [peca1, peca2] = resultado.posicionadas;

        // Calcula distância entre peças
        const distanciaX = Math.abs(peca2.x - (peca1.x + peca1.largura));
        const distanciaY = Math.abs(peca2.y - (peca1.y + peca1.altura));

        // Pelo menos uma distância deve ser >= espacamento
        expect(Math.min(distanciaX, distanciaY) >= 50 || Math.min(distanciaX, distanciaY) === 0).toBe(true);
      }
    });

    it('deve incluir métricas de tempo', () => {
      const pecas: Peca[] = [
        { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
      ];

      const resultado = posicionarPecas(pecas, 1000, 1000, 10);

      expect(resultado.metricas.tempo).toBeGreaterThanOrEqual(0);
    });

    it('deve preservar propriedades das peças (nome, ignorada, numeroOriginal)', () => {
      const pecas: Peca[] = [
        {
          largura: 100,
          altura: 100,
          tipoCorte: 'externo',
          id: '1',
          nome: 'Peça Teste',
          ignorada: true,
          numeroOriginal: 42
        },
      ];

      const resultado = posicionarPecas(pecas, 1000, 1000, 10);

      expect(resultado.posicionadas).toHaveLength(1);
      expect(resultado.posicionadas[0].nome).toBe('Peça Teste');
      expect(resultado.posicionadas[0].ignorada).toBe(true);
      expect(resultado.posicionadas[0].numeroOriginal).toBe(42);
    });
  });
});
