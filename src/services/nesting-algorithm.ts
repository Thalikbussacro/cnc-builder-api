import type { Peca, PecaPosicionada, Candidato, ResultadoNesting } from "../types";

// ============================================================================
// ALGORITMO ORIGINAL - GREEDY FIRST-FIT DECREASING (FFD)
// ============================================================================
// Mantido comentado para referência e possível rollback
// Baseado no código Delphi original (uFrmCNC2.pas linhas 250-327)

/*
export function cabeNoEspaco(
  nova: PecaPosicionada,
  lista: PecaPosicionada[],
  chapaLargura: number,
  chapaAltura: number,
  espacamento: number
): boolean {
  // Verifica se a peça ultrapassa os limites da chapa
  if (nova.x + nova.largura > chapaLargura || nova.y + nova.altura > chapaAltura) {
    return false;
  }

  // Verifica se a peça respeita o espaçamento mínimo das bordas
  // (como se as bordas fossem "outras peças")
  if (nova.x < espacamento || nova.y < espacamento) {
    return false;
  }

  // Verifica espaçamento da borda direita e superior
  if (nova.x + nova.largura + espacamento > chapaLargura ||
      nova.y + nova.altura + espacamento > chapaAltura) {
    return false;
  }

  for (const p of lista) {
    const aEsquerda = nova.x + nova.largura + espacamento <= p.x;
    const aDireita = nova.x >= p.x + p.largura + espacamento;
    const acima = nova.y + nova.altura + espacamento <= p.y;
    const abaixo = nova.y >= p.y + p.altura + espacamento;

    if (!aEsquerda && !aDireita && !acima && !abaixo) {
      return false;
    }
  }

  return true;
}

export function posicionarPecasGreedy(
  pecas: Peca[],
  chapaLargura: number,
  chapaAltura: number,
  espacamento: number
): ResultadoNesting {
  const pecasOrdenadas = [...pecas].sort((a, b) => {
    return b.largura * b.altura - a.largura * a.altura;
  });

  const posicionadas: PecaPosicionada[] = [];
  const naoCouberam: Peca[] = [];
  const candidatos: Candidato[] = [];

  candidatos.push({ x: 0, y: 0 });

  for (const peca of pecasOrdenadas) {
    let colocado = false;

    for (const cand of candidatos) {
      const novaPos: PecaPosicionada = {
        x: cand.x,
        y: cand.y,
        largura: peca.largura,
        altura: peca.altura,
        tipoCorte: peca.tipoCorte,
        id: peca.id,
        nome: peca.nome,
        ignorada: peca.ignorada,
        numeroOriginal: peca.numeroOriginal,
      };

      if (cabeNoEspaco(novaPos, posicionadas, chapaLargura, chapaAltura, espacamento)) {
        colocado = true;
        posicionadas.push(novaPos);

        candidatos.push({
          x: novaPos.x + novaPos.largura + espacamento,
          y: novaPos.y,
        });

        candidatos.push({
          x: novaPos.x,
          y: novaPos.y + novaPos.altura + espacamento,
        });

        break;
      }
    }

    if (!colocado) {
      naoCouberam.push(peca);
    }
  }

  return { posicionadas, naoCouberam };
}
*/

// ============================================================================
// FUNÇÕES AUXILIARES COMPARTILHADAS
// ============================================================================

/**
 * Verifica se uma peça cabe em determinada posição sem colidir com outras peças
 * @param margemBorda - Margem customizada para bordas (se undefined, usa espacamento)
 */
export function cabeNoEspaco(
  nova: PecaPosicionada,
  lista: PecaPosicionada[],
  chapaLargura: number,
  chapaAltura: number,
  espacamento: number,
  margemBorda?: number
): boolean {
  // Se margemBorda não for especificada, usa o espaçamento padrão
  const margem = margemBorda !== undefined ? margemBorda : espacamento;

  // Verifica se a peça ultrapassa os limites da chapa
  if (nova.x + nova.largura > chapaLargura || nova.y + nova.altura > chapaAltura) {
    return false;
  }

  // Verifica se a peça respeita o espaçamento mínimo das bordas
  // (como se as bordas fossem "outras peças")
  if (nova.x < margem || nova.y < margem) {
    return false;
  }

  // Verifica espaçamento da borda direita e superior
  if (nova.x + nova.largura + margem > chapaLargura ||
      nova.y + nova.altura + margem > chapaAltura) {
    return false;
  }

  // Verifica colisão com outras peças (usa espacamento entre peças, não margem)
  for (const p of lista) {
    const aEsquerda = nova.x + nova.largura + espacamento <= p.x;
    const aDireita = nova.x >= p.x + p.largura + espacamento;
    const acima = nova.y + nova.altura + espacamento <= p.y;
    const abaixo = nova.y >= p.y + p.altura + espacamento;

    if (!aEsquerda && !aDireita && !acima && !abaixo) {
      return false;
    }
  }

  return true;
}

/**
 * Calcula distância euclidiana entre dois pontos
 */
function distanciaEuclidiana(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Otimiza ordem de peças usando algoritmo de vizinho mais próximo (TSP simplificado)
 * Minimiza deslocamentos em vazio da fresa entre peças
 */
function otimizarOrdemCorte(pecas: PecaPosicionada[]): PecaPosicionada[] {
  if (pecas.length <= 1) return pecas;

  const naoVisitadas = [...pecas];
  const ordenadas: PecaPosicionada[] = [];

  // Começa pela peça mais próxima da origem (0, 0)
  let atual = naoVisitadas.reduce((closest, peca) => {
    const distAtual = distanciaEuclidiana(0, 0, peca.x, peca.y);
    const distClosest = distanciaEuclidiana(0, 0, closest.x, closest.y);
    return distAtual < distClosest ? peca : closest;
  });

  naoVisitadas.splice(naoVisitadas.indexOf(atual), 1);
  ordenadas.push(atual);

  // Para cada peça restante, escolhe a mais próxima da atual
  while (naoVisitadas.length > 0) {
    let maisProxima = naoVisitadas[0];
    let menorDistancia = distanciaEuclidiana(
      atual.x + atual.largura / 2,
      atual.y + atual.altura / 2,
      maisProxima.x + maisProxima.largura / 2,
      maisProxima.y + maisProxima.altura / 2
    );

    for (let i = 1; i < naoVisitadas.length; i++) {
      const candidata = naoVisitadas[i];
      const dist = distanciaEuclidiana(
        atual.x + atual.largura / 2,
        atual.y + atual.altura / 2,
        candidata.x + candidata.largura / 2,
        candidata.y + candidata.altura / 2
      );

      if (dist < menorDistancia) {
        menorDistancia = dist;
        maisProxima = candidata;
      }
    }

    naoVisitadas.splice(naoVisitadas.indexOf(maisProxima), 1);
    ordenadas.push(maisProxima);
    atual = maisProxima;
  }

  return ordenadas;
}

// ============================================================================
// ALGORITMO 1: GREEDY FIRST-FIT DECREASING (FFD) - Melhorado
// ============================================================================

/**
 * Algoritmo Greedy FFD com otimização de ordem de corte
 * Estratégia: Ordena por área, posiciona em primeiro candidato disponível
 * Vantagens: Rápido, simples, previsível
 * Desvantagens: Não garante solução ótima, pode desperdiçar espaço
 */
export function posicionarPecasGreedy(
  pecas: Peca[],
  chapaLargura: number,
  chapaAltura: number,
  espacamento: number,
  margemBorda?: number
): ResultadoNesting {
  const margem = margemBorda !== undefined ? margemBorda : espacamento;
  const pecasOrdenadas = [...pecas].sort((a, b) => {
    return b.largura * b.altura - a.largura * a.altura;
  });

  const posicionadas: PecaPosicionada[] = [];
  const naoCouberam: Peca[] = [];
  const candidatos: Candidato[] = [{ x: margem, y: margem }];

  for (const peca of pecasOrdenadas) {
    let colocado = false;

    for (const cand of candidatos) {
      const novaPos: PecaPosicionada = {
        x: cand.x,
        y: cand.y,
        largura: peca.largura,
        altura: peca.altura,
        tipoCorte: peca.tipoCorte,
        id: peca.id,
        nome: peca.nome,
        ignorada: peca.ignorada,
        numeroOriginal: peca.numeroOriginal,
      };

      if (cabeNoEspaco(novaPos, posicionadas, chapaLargura, chapaAltura, espacamento, margemBorda)) {
        posicionadas.push(novaPos);

        candidatos.push({
          x: novaPos.x + novaPos.largura + espacamento,
          y: novaPos.y,
        });

        candidatos.push({
          x: novaPos.x,
          y: novaPos.y + novaPos.altura + espacamento,
        });

        colocado = true;
        break;
      }
    }

    if (!colocado) {
      naoCouberam.push(peca);
    }
  }

  // Otimiza ordem de corte para minimizar deslocamentos
  const posicionadasOtimizadas = otimizarOrdemCorte(posicionadas);

  return { posicionadas: posicionadasOtimizadas, naoCouberam };
}

// ============================================================================
// ALGORITMO 2: SHELF/SKYLINE (Next-Fit Decreasing Height)
// ============================================================================

interface Shelf {
  y: number;          // Posição Y da prateleira
  altura: number;     // Altura da prateleira (peça mais alta)
  xAtual: number;     // Próxima posição X disponível
}

/**
 * Algoritmo Shelf/Skyline para nesting
 * Estratégia: Organiza peças em "prateleiras" horizontais
 * Vantagens: Melhor aproveitamento vertical, menos desperdício
 * Desvantagens: Pode deixar espaços horizontais não utilizados
 */
export function posicionarPecasShelf(
  pecas: Peca[],
  chapaLargura: number,
  chapaAltura: number,
  espacamento: number,
  margemBorda?: number
): ResultadoNesting {
  const margem = margemBorda !== undefined ? margemBorda : espacamento;
  // Ordena peças por altura decrescente (otimização para shelf packing)
  const pecasOrdenadas = [...pecas].sort((a, b) => {
    if (b.altura !== a.altura) return b.altura - a.altura;
    return b.largura - a.largura; // Desempate por largura
  });

  const posicionadas: PecaPosicionada[] = [];
  const naoCouberam: Peca[] = [];
  const shelves: Shelf[] = [];

  let shelfAtual: Shelf = {
    y: margem,
    altura: 0,
    xAtual: margem,
  };

  for (const peca of pecasOrdenadas) {
    let colocado = false;

    // Tenta colocar na shelf atual
    // Verifica se cabe horizontalmente com espaçamento da borda direita
    if (shelfAtual.xAtual + peca.largura + margem <= chapaLargura) {
      const yPosicao = shelfAtual.y;

      // Verifica se cabe verticalmente com espaçamento da borda superior
      if (yPosicao + peca.altura + margem <= chapaAltura) {
        const novaPeca: PecaPosicionada = {
          x: shelfAtual.xAtual,
          y: yPosicao,
          largura: peca.largura,
          altura: peca.altura,
          tipoCorte: peca.tipoCorte,
          id: peca.id,
          nome: peca.nome,
          ignorada: peca.ignorada,
          numeroOriginal: peca.numeroOriginal,
        };

        // Safety check: valida que não há colisões com peças já posicionadas
        if (cabeNoEspaco(novaPeca, posicionadas, chapaLargura, chapaAltura, espacamento, margemBorda)) {
          posicionadas.push(novaPeca);

          shelfAtual.xAtual += peca.largura + espacamento;
          shelfAtual.altura = Math.max(shelfAtual.altura, peca.altura);
          colocado = true;
        }
      }
    }

    // Se não coube na shelf atual, tenta criar nova shelf
    if (!colocado) {
      const novaShelfY = shelfAtual.y + shelfAtual.altura + espacamento;

      // Verifica se nova shelf cabe com espaçamento das bordas
      if (novaShelfY + peca.altura + margem <= chapaAltura &&
          margem + peca.largura + margem <= chapaLargura) {

        const novaPeca: PecaPosicionada = {
          x: margem,
          y: novaShelfY,
          largura: peca.largura,
          altura: peca.altura,
          tipoCorte: peca.tipoCorte,
          id: peca.id,
          nome: peca.nome,
          ignorada: peca.ignorada,
          numeroOriginal: peca.numeroOriginal,
        };

        // Safety check: valida que não há colisões
        if (cabeNoEspaco(novaPeca, posicionadas, chapaLargura, chapaAltura, espacamento, margemBorda)) {
          shelves.push(shelfAtual);

          shelfAtual = {
            y: novaShelfY,
            altura: peca.altura,
            xAtual: margem + peca.largura + espacamento,
          };

          posicionadas.push(novaPeca);
          colocado = true;
        }
      }
    }

    if (!colocado) {
      naoCouberam.push(peca);
    }
  }

  // Otimiza ordem de corte
  const posicionadasOtimizadas = otimizarOrdemCorte(posicionadas);

  return { posicionadas: posicionadasOtimizadas, naoCouberam };
}

// ============================================================================
// ALGORITMO 3: GUILLOTINE (Split Recursivo)
// ============================================================================

interface Retangulo {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

/**
 * Algoritmo Guillotine para nesting
 * Estratégia: Divide recursivamente o espaço em retângulos livres
 * Vantagens: Melhor para peças de tamanhos variados, divisão eficiente
 * Desvantagens: Mais complexo, pode criar muitos fragmentos pequenos
 */
export function posicionarPecasGuillotine(
  pecas: Peca[],
  chapaLargura: number,
  chapaAltura: number,
  espacamento: number,
  margemBorda?: number
): ResultadoNesting {
  const margem = margemBorda !== undefined ? margemBorda : espacamento;
  // Ordena peças por área decrescente
  const pecasOrdenadas = [...pecas].sort((a, b) => {
    return b.largura * b.altura - a.largura * a.altura;
  });

  const posicionadas: PecaPosicionada[] = [];
  const naoCouberam: Peca[] = [];

  // Lista de retângulos livres disponíveis
  const retangulosLivres: Retangulo[] = [
    { x: margem, y: margem, largura: chapaLargura - 2 * margem, altura: chapaAltura - 2 * margem }
  ];

  for (const peca of pecasOrdenadas) {
    let colocado = false;

    // Procura melhor retângulo livre (menor área que ainda cabe a peça)
    let melhorIndice = -1;
    let menorArea = Infinity;

    for (let i = 0; i < retangulosLivres.length; i++) {
      const ret = retangulosLivres[i];

      if (peca.largura <= ret.largura && peca.altura <= ret.altura) {
        const area = ret.largura * ret.altura;
        if (area < menorArea) {
          menorArea = area;
          melhorIndice = i;
        }
      }
    }

    if (melhorIndice !== -1) {
      const ret = retangulosLivres[melhorIndice];

      // Posiciona peça no canto inferior esquerdo do retângulo
      posicionadas.push({
        x: ret.x,
        y: ret.y,
        largura: peca.largura,
        altura: peca.altura,
        tipoCorte: peca.tipoCorte,
        id: peca.id,
        nome: peca.nome,
      });

      // Remove retângulo usado
      retangulosLivres.splice(melhorIndice, 1);

      // Cria novos retângulos livres (split horizontal vs vertical)
      const sobralLargura = ret.largura - peca.largura - espacamento;
      const sobralAltura = ret.altura - peca.altura - espacamento;

      // Escolhe melhor divisão (maior retângulo resultante)
      const areaHorizontal = ret.largura * sobralAltura;
      const areaVertical = sobralLargura * ret.altura;

      if (areaHorizontal > areaVertical) {
        // Split horizontal: cria retângulo à direita e acima
        if (sobralLargura > 0) {
          retangulosLivres.push({
            x: ret.x + peca.largura + espacamento,
            y: ret.y,
            largura: sobralLargura,
            altura: peca.altura,
          });
        }

        if (sobralAltura > 0) {
          retangulosLivres.push({
            x: ret.x,
            y: ret.y + peca.altura + espacamento,
            largura: ret.largura,
            altura: sobralAltura,
          });
        }
      } else {
        // Split vertical: cria retângulo acima e à direita
        if (sobralAltura > 0) {
          retangulosLivres.push({
            x: ret.x,
            y: ret.y + peca.altura + espacamento,
            largura: peca.largura,
            altura: sobralAltura,
          });
        }

        if (sobralLargura > 0) {
          retangulosLivres.push({
            x: ret.x + peca.largura + espacamento,
            y: ret.y,
            largura: sobralLargura,
            altura: ret.altura,
          });
        }
      }

      colocado = true;
    }

    if (!colocado) {
      naoCouberam.push(peca);
    }
  }

  // Otimiza ordem de corte
  const posicionadasOtimizadas = otimizarOrdemCorte(posicionadas);

  return { posicionadas: posicionadasOtimizadas, naoCouberam };
}

// ============================================================================
// FUNÇÃO PRINCIPAL DE SELEÇÃO DE ALGORITMO
// ============================================================================

export type MetodoNesting = 'greedy' | 'shelf' | 'guillotine';

/**
 * Posiciona peças usando o método de nesting escolhido
 *
 * @param pecas - Array de peças a serem posicionadas
 * @param chapaLargura - Largura da chapa
 * @param chapaAltura - Altura da chapa
 * @param espacamento - Espaçamento mínimo entre peças
 * @param metodo - Método de nesting: 'greedy' | 'shelf' | 'guillotine'
 * @param margemBorda - Margem customizada para bordas da chapa (se undefined, usa espacamento)
 * @returns Resultado do nesting com métricas de performance
 */
export function posicionarPecas(
  pecas: Peca[],
  chapaLargura: number,
  chapaAltura: number,
  espacamento: number,
  metodo: MetodoNesting = 'greedy',
  margemBorda?: number
): ResultadoNesting & { metricas: { areaUtilizada: number; eficiencia: number; tempo: number } } {
  const inicio = performance.now();

  let resultado: ResultadoNesting;

  switch (metodo) {
    case 'shelf':
      resultado = posicionarPecasShelf(pecas, chapaLargura, chapaAltura, espacamento, margemBorda);
      break;
    case 'guillotine':
      resultado = posicionarPecasGuillotine(pecas, chapaLargura, chapaAltura, espacamento, margemBorda);
      break;
    case 'greedy':
    default:
      resultado = posicionarPecasGreedy(pecas, chapaLargura, chapaAltura, espacamento, margemBorda);
      break;
  }

  const tempo = performance.now() - inicio;

  // Calcula métricas de eficiência
  const areaChapa = chapaLargura * chapaAltura;
  const areaUtilizada = resultado.posicionadas.reduce(
    (total, peca) => total + peca.largura * peca.altura,
    0
  );
  const eficiencia = (areaUtilizada / areaChapa) * 100;

  return {
    ...resultado,
    metricas: {
      areaUtilizada,
      eficiencia: Math.round(eficiencia * 100) / 100,
      tempo: Math.round(tempo * 100) / 100,
    },
  };
}
