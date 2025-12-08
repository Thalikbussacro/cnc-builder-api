# CNC Builder API

API REST para geração de código G-code com algoritmos inteligentes de nesting para máquinas CNC.

Este projeto fornece endpoints para otimização de layout de peças e geração automática de trajetórias de corte, incluindo validação de configurações, cache de resultados e monitoramento de performance.

## Escolha da Cloud e Diagramas

Podem ser encontrados dentro da pasta docs/ no repositório.

## Instalação

### Requisitos

- Node.js 18 ou superior
- npm ou yarn

### Configuração

```bash
# Clonar o repositório
git clone https://github.com/Thalikbussacro/cnc-builder-api.git
cd cnc-builder-api

# Instalar dependências
npm install

# Configurar variáveis de ambiente (opcional)
cp .env.example .env

# Iniciar servidor de desenvolvimento
npm run dev
```

O servidor estará disponível em `http://localhost:3001`.

## Uso

### Documentação da API

A documentação completa da API está disponível via Swagger UI em:

```
http://localhost:3001/api-docs
```

A interface interativa inclui:
- Schemas completos de requisição e resposta
- Funcionalidade de teste direto dos endpoints
- Informações de rate limiting
- Exemplos de respostas de erro

### Exemplo Básico

```bash
curl -X POST http://localhost:3001/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{
    "pecas": [
      {
        "id": "1",
        "largura": 100,
        "altura": 200,
        "tipoCorte": "externo"
      }
    ]
  }'
```

## Desenvolvimento

### Scripts Disponíveis

```bash
# Desenvolvimento com hot reload
npm run dev

# Build de produção
npm run build

# Executar servidor em produção
npm start

# Executar testes
npm test

# Testes com cobertura
npm run test:coverage

# Testes em modo watch
npm run test:watch
```

### Estrutura do Projeto

```
cnc-builder-api/
├── src/
│   ├── __tests__/           # Suítes de testes (unit, integration, e2e)
│   ├── config/              # Configurações (environment, swagger)
│   ├── middleware/          # Middlewares Express (error-handler, rate-limit, sanitize)
│   ├── routes/              # Definição de rotas da API
│   ├── schemas/             # Schemas de validação Zod
│   ├── services/            # Lógica de negócio (cache, nesting, G-code)
│   ├── types/               # Definições de tipos TypeScript
│   ├── utils/               # Utilitários (logger, defaults)
│   └── server.ts            # Configuração do servidor Express
├── dist/                    # JavaScript compilado (gerado)
└── .env.example             # Template de variáveis de ambiente
```

### Algoritmos de Nesting

O projeto implementa três algoritmos de otimização de layout:

- **Greedy**: Algoritmo first-fit simples e rápido
- **Shelf**: Empacotamento baseado em prateleiras horizontais
- **Guillotine**: Cortes guilhotina recursivos (padrão, melhor eficiência)

### Testes

A suíte de testes inclui:
- 30 testes unitários (algoritmos de nesting, geração de G-code)
- 32 testes de integração (endpoints da API, health checks)
- 13 testes E2E (fluxos completos, caching, algoritmos)

Total: 75 testes com ~85% de cobertura.

## Configuração

### Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `NODE_ENV` | `development` | Ambiente de execução |
| `PORT` | `3001` | Porta do servidor |
| `LOG_LEVEL` | `info` | Nível de logging (error, warn, info, debug) |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Origens permitidas para CORS (separadas por vírgula) |

### Rate Limiting

- API global: 100 requisições por 15 minutos
- Geração de G-code: 20 requisições por minuto
- Validação: 20 requisições por minuto

### Cache

- TTL: 5 minutos
- Aplicado em endpoints de validação
- Taxa média de hit: ~75%

## Deploy

### Build de Produção

```bash
npm run build
npm start
```

### Configuração de Ambiente

1. Copiar `.env.example` para `.env`
2. Configurar `ALLOWED_ORIGINS` com os domínios permitidos
3. Definir `LOG_LEVEL=warn` para produção
4. Garantir `NODE_ENV=production`

### Health Checks

Para configuração em load balancers ou Kubernetes:

- **Liveness**: `GET /live`
- **Readiness**: `GET /ready`
- **Health**: `GET /health` (básico) ou `GET /health/detailed` (detalhado)

### Monitoramento

Todos os responses incluem headers de monitoramento:

- `X-Request-ID`: Identificador único da requisição (UUID v4)
- `X-RateLimit-Limit`: Limite de requisições
- `X-RateLimit-Remaining`: Requisições restantes
- `X-RateLimit-Reset`: Timestamp de reset do limite

Endpoint de estatísticas do cache:
```bash
curl http://localhost:3001/api/cache/stats
```

## Segurança

- Headers de segurança via Helmet.js
- CORS restritivo com whitelist de origens
- Sanitização de inputs com Validator.js
- Validação runtime com schemas Zod
- Limite de tamanho de payload: 2MB
- Limite de arrays: 1000 itens
- Timeouts automáticos: 30s (geração), 10s (validação)

## Licença

ISC
