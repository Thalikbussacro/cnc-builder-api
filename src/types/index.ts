/**
 * Tipo de corte: como a fresa deve cortar em relação à marcação
 */
export type TipoCorte = 'externo' | 'interno' | 'na-linha';

/**
 * Representa uma peça retangular a ser cortada
 */
export type Peca = {
  largura: number;
  altura: number;
  tipoCorte: TipoCorte;
  id: string; // UUID para React keys
  nome?: string; // Nome customizável da peça
  ignorada?: boolean; // Se true, peça é ignorada no G-code (reserva espaço mas não corta)
  numeroOriginal?: number; // Número original da peça na ordem de adição (1, 2, 3...)
};

/**
 * Representa uma peça já posicionada na chapa
 */
export type PecaPosicionada = {
  x: number;
  y: number;
  largura: number;
  altura: number;
  tipoCorte: TipoCorte;
  id: string;
  nome?: string; // Nome customizável da peça
  ignorada?: boolean; // Se true, peça é ignorada no G-code (reserva espaço mas não corta)
  numeroOriginal?: number; // Número original da peça na ordem de adição (1, 2, 3...)
};

/**
 * Configurações da chapa de metal
 */
export type ConfiguracoesChapa = {
  largura: number;
  altura: number;
  espessura: number;
};

/**
 * Define quando aplicar rampa de entrada
 */
export type AplicarRampaEm = 'primeira-passada' | 'todas-passadas';

/**
 * Configurações do processo de corte
 */
export type ConfiguracoesCorte = {
  profundidade: number;
  espacamento: number;
  profundidadePorPassada: number;  // mm - Quanto desce em cada passada
  feedrate: number;                 // mm/min - Velocidade de avanço durante corte
  plungeRate: number;               // mm/min - Velocidade de descida (mergulho) no eixo Z
  rapidsSpeed: number;              // mm/min - Velocidade de movimento rápido (G0)
  spindleSpeed: number;             // RPM - Rotação da fresa
  usarRampa: boolean;               // Ativar rampa de entrada ao invés de mergulho vertical
  anguloRampa: number;              // graus - Ângulo da rampa de entrada (2° a 5°)
  aplicarRampaEm: AplicarRampaEm;   // Quando aplicar rampa (primeira ou todas passadas)
  usarMesmoEspacamentoBorda: boolean; // Se true, usa o mesmo espaçamento entre peças para margem de borda
  margemBorda: number;              // mm - Margem de borda customizada (só usado se usarMesmoEspacamentoBorda = false)
};

/**
 * Formatos disponíveis para exportação de G-code
 */
export type FormatoArquivo = 'nc' | 'tap' | 'gcode' | 'cnc';

/**
 * Versões do gerador de G-code
 */
export type VersaoGerador = 'v1' | 'v2';

/**
 * Informações sobre cada versão do gerador
 */
export type InfoVersaoGerador = {
  versao: VersaoGerador;
  nome: string;
  descricao: string;
  recursos: string[];
  recomendado?: boolean;
};

/**
 * Configurações da ferramenta (fresa)
 * Apenas os parâmetros que realmente afetam o G-code gerado
 */
export type ConfiguracoesFerramenta = {
  diametro: number;           // mm - Diâmetro da fresa (usado para compensação G41/G42)
  numeroFerramenta: number;   // T1, T2, etc. - Usado no comando de troca de ferramenta
};

/**
 * Ponto candidato para posicionar próxima peça
 * Usado pelo algoritmo de nesting
 */
export type Candidato = {
  x: number;
  y: number;
};

/**
 * Resultado do algoritmo de nesting
 */
export type ResultadoNesting = {
  posicionadas: PecaPosicionada[];
  naoCouberam: Peca[];
};

/**
 * Tempo estimado de execução do G-code
 */
export type TempoEstimado = {
  tempoCorte: number;          // segundos - movimentos G1 laterais (feedrate)
  tempoMergulho: number;       // segundos - movimentos G1 verticais (plungeRate)
  tempoPosicionamento: number; // segundos - movimentos G0 (rapidsSpeed)
  tempoTotal: number;          // segundos - soma total
  distanciaCorte?: number;        // mm - distância total de corte
  distanciaMergulho?: number;     // mm - distância total de mergulho
  distanciaPosicionamento?: number; // mm - distância total de posicionamento
  distanciaTotal?: number;        // mm - distância total percorrida
};
