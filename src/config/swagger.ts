import swaggerJsdoc from 'swagger-jsdoc';
import { appConfig } from './index';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'CNC Builder API',
    version: '1.0.0',
    description: `
REST API para geração de G-code com algoritmos de nesting otimizados.

## Recursos Principais
- Geração de G-code a partir de especificações de peças
- Algoritmos de nesting (Shelf, Guillotine, MaxRects)
- Validação pré-geração com preview
- Cache de validações para performance
- Health checks e métricas do sistema

## Rate Limiting
- **Global:** 100 requisições por 15 minutos
- **Geração:** 20 requisições por minuto por endpoint

## Request ID
Todas as respostas incluem o header \`X-Request-ID\` para rastreamento.
Você pode fornecer seu próprio ID através do header na requisição.
    `.trim(),
    contact: {
      name: 'API Support',
      url: 'https://github.com/Thalikbussacro/cnc-builder-api',
    },
    license: {
      name: 'ISC',
      url: 'https://opensource.org/licenses/ISC',
    },
  },
  servers: [
    {
      url: appConfig.isDevelopment
        ? `http://localhost:${appConfig.port}`
        : 'https://cnc-builder-api.vercel.app',
      description: appConfig.isDevelopment ? 'Development server' : 'Production server',
    },
  ],
  tags: [
    {
      name: 'G-code',
      description: 'Endpoints para geração e validação de G-code',
    },
    {
      name: 'Health',
      description: 'Health checks e métricas do sistema',
    },
    {
      name: 'Cache',
      description: 'Estatísticas e gerenciamento de cache',
    },
  ],
  components: {
    schemas: {
      Peca: {
        type: 'object',
        required: ['largura', 'altura', 'tipoCorte', 'id'],
        properties: {
          id: {
            type: 'string',
            description: 'Identificador único da peça',
            example: '1',
          },
          largura: {
            type: 'number',
            description: 'Largura da peça em mm',
            minimum: 0.1,
            example: 100,
          },
          altura: {
            type: 'number',
            description: 'Altura da peça em mm',
            minimum: 0.1,
            example: 150,
          },
          tipoCorte: {
            type: 'string',
            enum: ['externo', 'interno', 'na-linha'],
            description: 'Tipo de corte da peça',
            example: 'externo',
          },
          prioridade: {
            type: 'number',
            description: 'Prioridade de posicionamento (maior = primeira)',
            minimum: 1,
            maximum: 10,
            example: 5,
          },
        },
      },
      ConfigChapa: {
        type: 'object',
        properties: {
          largura: {
            type: 'number',
            description: 'Largura da chapa em mm',
            default: 1220,
            example: 1220,
          },
          altura: {
            type: 'number',
            description: 'Altura da chapa em mm',
            default: 2440,
            example: 2440,
          },
          espessura: {
            type: 'number',
            description: 'Espessura da chapa em mm',
            default: 15,
            example: 15,
          },
        },
      },
      ConfigCorte: {
        type: 'object',
        properties: {
          profundidade: {
            type: 'number',
            description: 'Profundidade do corte em mm',
            default: 15,
            example: 15,
          },
          espacamento: {
            type: 'number',
            description: 'Espaçamento mínimo entre peças em mm',
            default: 3,
            example: 3,
          },
        },
      },
      ConfigMaquina: {
        type: 'object',
        properties: {
          velocidadeCorte: {
            type: 'number',
            description: 'Velocidade de corte em mm/min',
            default: 1000,
            example: 1000,
          },
          velocidadeDeslocamento: {
            type: 'number',
            description: 'Velocidade de deslocamento (sem corte) em mm/min',
            default: 3000,
            example: 3000,
          },
        },
      },
      GCodeResponse: {
        type: 'object',
        properties: {
          gcode: {
            type: 'string',
            description: 'Código G-code gerado',
            example: 'G21\\nG90\\nG28\\n...',
          },
          metadata: {
            type: 'object',
            properties: {
              linhas: {
                type: 'number',
                description: 'Número de linhas do G-code',
                example: 150,
              },
              tamanhoBytes: {
                type: 'number',
                description: 'Tamanho do G-code em bytes',
                example: 3245,
              },
              tempoEstimado: {
                type: 'string',
                description: 'Tempo estimado de execução',
                example: '5min 30s',
              },
              metricas: {
                type: 'object',
                properties: {
                  eficiencia: {
                    type: 'number',
                    description: 'Eficiência de uso da chapa (%)',
                    example: 78.5,
                  },
                  areaTotal: {
                    type: 'number',
                    description: 'Área total das peças (mm²)',
                    example: 15000,
                  },
                  areaUtilizada: {
                    type: 'number',
                    description: 'Área utilizada da chapa (mm²)',
                    example: 15000,
                  },
                },
              },
              configuracoes: {
                type: 'object',
                description: 'Configurações utilizadas na geração',
              },
            },
          },
        },
      },
      ValidationResponse: {
        type: 'object',
        properties: {
          valid: {
            type: 'boolean',
            description: 'Se a configuração é válida',
            example: true,
          },
          errors: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lista de erros encontrados',
            example: [],
          },
          warnings: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lista de avisos',
            example: ['Peça 1 tem prioridade baixa'],
          },
          preview: {
            type: 'object',
            properties: {
              tempoEstimado: {
                type: 'string',
                example: '5min 30s',
              },
              metricas: {
                type: 'object',
              },
              pecasPosicionadas: {
                type: 'array',
                items: { type: 'object' },
              },
              pecasNaoCouberam: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Mensagem de erro',
            example: 'Dados inválidos',
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                path: { type: 'array', items: { type: 'string' } },
                message: { type: 'string' },
              },
            },
            description: 'Detalhes dos erros de validação',
          },
        },
      },
    },
    headers: {
      'X-Request-ID': {
        description: 'ID único da requisição para rastreamento',
        schema: {
          type: 'string',
          format: 'uuid',
        },
      },
      'X-RateLimit-Limit': {
        description: 'Número máximo de requisições permitidas',
        schema: {
          type: 'integer',
        },
      },
      'X-RateLimit-Remaining': {
        description: 'Número de requisições restantes',
        schema: {
          type: 'integer',
        },
      },
      'X-RateLimit-Reset': {
        description: 'Timestamp quando o rate limit será resetado',
        schema: {
          type: 'integer',
        },
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts', // Arquivos com anotações JSDoc
    './src/routes/*.js', // Incluir versão compilada também
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
