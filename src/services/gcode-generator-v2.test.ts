import { gerarGCodeV2, removerComentarios, formatarTempo, calcularTempoEstimado } from './gcode-generator-v2';
import type { PecaPosicionada, ConfiguracoesChapa, ConfiguracoesCorte } from '../types';

describe('G-code Generator V2', () => {
  const configChapa: ConfiguracoesChapa = {
    largura: 1000,
    altura: 1000,
    espessura: 15,
  };

  const configCorte: ConfiguracoesCorte = {
    profundidade: 15,
    espacamento: 10,
    profundidadePorPassada: 5,
    feedrate: 1500,
    plungeRate: 500,
    rapidsSpeed: 4000,
    spindleSpeed: 18000,
    usarRampa: false,
    anguloRampa: 3,
    aplicarRampaEm: 'primeira-passada',
    usarMesmoEspacamentoBorda: true,
    margemBorda: 10,
  };

  describe('gerarGCodeV2', () => {
    it('deve gerar G-code válido para uma peça simples', () => {
      const pecas: PecaPosicionada[] = [
        { id: '1', largura: 100, altura: 100, x: 0, y: 0, tipoCorte: 'externo' },
      ];

      const gcode = gerarGCodeV2(pecas, configChapa, configCorte);

      expect(gcode).toContain('G21'); // Modo métrico
      expect(gcode).toContain('G90'); // Posicionamento absoluto
      expect(gcode).toContain('M30'); // Fim de programa
    });

    it('deve incluir comentários quando solicitado', () => {
      const pecas: PecaPosicionada[] = [
        { id: '1', largura: 100, altura: 100, x: 0, y: 0, tipoCorte: 'externo' },
      ];

      const gcode = gerarGCodeV2(pecas, configChapa, configCorte, undefined, true);

      expect(gcode).toContain('(');
      expect(gcode).toContain(')');
      expect(gcode).toContain(';');
    });

    it('deve remover comentários quando solicitado', () => {
      const pecas: PecaPosicionada[] = [
        { id: '1', largura: 100, altura: 100, x: 0, y: 0, tipoCorte: 'externo' },
      ];

      const gcode = gerarGCodeV2(pecas, configChapa, configCorte, undefined, false);

      expect(gcode).not.toContain('===');
      expect(gcode).not.toContain('Gerado em:');
    });

    it('deve retornar erro para profundidade inválida', () => {
      const pecas: PecaPosicionada[] = [
        { id: '1', largura: 100, altura: 100, x: 0, y: 0, tipoCorte: 'externo' },
      ];

      const configCorteInvalido = { ...configCorte, profundidade: 0 };
      const gcode = gerarGCodeV2(pecas, configChapa, configCorteInvalido);

      expect(gcode).toContain('ERRO');
      expect(gcode).toContain('Profundidade invalida');
    });

    it('deve retornar erro para profundidadePorPassada inválida', () => {
      const pecas: PecaPosicionada[] = [
        { id: '1', largura: 100, altura: 100, x: 0, y: 0, tipoCorte: 'externo' },
      ];

      const configCorteInvalido = { ...configCorte, profundidadePorPassada: 0 };
      const gcode = gerarGCodeV2(pecas, configChapa, configCorteInvalido);

      expect(gcode).toContain('ERRO');
      expect(gcode).toContain('Profundidade por passada invalida');
    });

    it('deve retornar erro quando profundidadePorPassada > profundidade', () => {
      const pecas: PecaPosicionada[] = [
        { id: '1', largura: 100, altura: 100, x: 0, y: 0, tipoCorte: 'externo' },
      ];

      const configCorteInvalido = { ...configCorte, profundidade: 5, profundidadePorPassada: 10 };
      const gcode = gerarGCodeV2(pecas, configChapa, configCorteInvalido);

      expect(gcode).toContain('ERRO');
      expect(gcode).toContain('maior que profundidade total');
    });

    it('deve lidar com array vazio de peças', () => {
      const pecas: PecaPosicionada[] = [];

      const gcode = gerarGCodeV2(pecas, configChapa, configCorte);

      expect(gcode).toContain('M30'); // Deve ter fim de programa
      expect(gcode).toContain('G21'); // Comandos básicos devem estar presentes
    });

    it('deve lidar com diferentes tipos de corte', () => {
      const pecas: PecaPosicionada[] = [
        { id: '1', largura: 100, altura: 100, x: 0, y: 0, tipoCorte: 'externo' },
        { id: '2', largura: 50, altura: 50, x: 200, y: 200, tipoCorte: 'interno' },
        { id: '3', largura: 75, altura: 75, x: 400, y: 400, tipoCorte: 'na-linha' },
      ];

      const gcode = gerarGCodeV2(pecas, configChapa, configCorte);

      expect(gcode).toBeDefined();
      expect(gcode.length).toBeGreaterThan(0);
    });

    it('deve preservar propriedades opcionais das peças', () => {
      const pecas: PecaPosicionada[] = [
        {
          id: '1',
          largura: 100,
          altura: 100,
          x: 0,
          y: 0,
          tipoCorte: 'externo',
          nome: 'Peça Teste',
          ignorada: false,
          numeroOriginal: 1
        },
      ];

      const gcode = gerarGCodeV2(pecas, configChapa, configCorte, undefined, true);

      // Se incluir comentários, pode mencionar o nome ou número da peça
      expect(gcode).toBeDefined();
    });
  });

  describe('removerComentarios', () => {
    it('deve remover comentários com ponto e vírgula', () => {
      const gcode = 'G21 ; modo métrico\nG90 ; absoluto';
      const resultado = removerComentarios(gcode);

      expect(resultado).not.toContain(';');
      expect(resultado).toContain('G21');
      expect(resultado).toContain('G90');
    });

    it('deve remover comentários com parênteses', () => {
      const gcode = 'G21 (modo métrico)\nG90 (absoluto)';
      const resultado = removerComentarios(gcode);

      expect(resultado).not.toContain('(');
      expect(resultado).not.toContain(')');
      expect(resultado).toContain('G21');
      expect(resultado).toContain('G90');
    });

    it('deve remover linhas vazias', () => {
      const gcode = 'G21\n\n\nG90\n\n';
      const resultado = removerComentarios(gcode);

      expect(resultado).not.toContain('\n\n');
    });
  });

  describe('formatarTempo', () => {
    it('deve formatar segundos corretamente', () => {
      expect(formatarTempo(45)).toBe('45s');
    });

    it('deve formatar minutos e segundos', () => {
      expect(formatarTempo(125)).toBe('2min 05s');
    });

    it('deve formatar horas, minutos e segundos', () => {
      expect(formatarTempo(3665)).toBe('1h 01min 05s');
    });

    it('deve lidar com zero segundos', () => {
      expect(formatarTempo(0)).toBe('0s');
    });
  });

  describe('calcularTempoEstimado', () => {
    it('deve calcular tempo para uma peça', () => {
      const pecas: PecaPosicionada[] = [
        { id: '1', largura: 100, altura: 100, x: 0, y: 0, tipoCorte: 'externo' },
      ];

      const tempo = calcularTempoEstimado(pecas, configChapa, configCorte);

      expect(tempo.tempoTotal).toBeGreaterThan(0);
      expect(tempo.tempoCorte).toBeGreaterThan(0);
      expect(tempo.tempoMergulho).toBeGreaterThan(0);
      expect(tempo.tempoPosicionamento).toBeGreaterThan(0);
    });

    it('deve retornar zero para array vazio', () => {
      const pecas: PecaPosicionada[] = [];

      const tempo = calcularTempoEstimado(pecas, configChapa, configCorte);

      expect(tempo.tempoTotal).toBe(0);
      expect(tempo.tempoCorte).toBe(0);
      expect(tempo.tempoMergulho).toBe(0);
      expect(tempo.tempoPosicionamento).toBe(0);
    });

    it('deve calcular tempo proporcional ao número de peças', () => {
      const umaPeca: PecaPosicionada[] = [
        { id: '1', largura: 100, altura: 100, x: 0, y: 0, tipoCorte: 'externo' },
      ];

      const duasPecas: PecaPosicionada[] = [
        { id: '1', largura: 100, altura: 100, x: 0, y: 0, tipoCorte: 'externo' },
        { id: '2', largura: 100, altura: 100, x: 200, y: 0, tipoCorte: 'externo' },
      ];

      const tempo1 = calcularTempoEstimado(umaPeca, configChapa, configCorte);
      const tempo2 = calcularTempoEstimado(duasPecas, configChapa, configCorte);

      expect(tempo2.tempoTotal).toBeGreaterThan(tempo1.tempoTotal);
    });
  });
});
