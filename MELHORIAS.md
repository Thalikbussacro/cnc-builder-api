# 🚀 Melhorias - CNC Builder API

> **Como usar este arquivo:**
> 1. Peça ao Claude Code: "Implemente a melhoria #X.Y do MELHORIAS.md"
> 2. Após implementar, ele marcará `[ ]` como `[x]`
> 3. Commit após cada melhoria ou grupo de melhorias relacionadas

**Última atualização:** 2025-12-05
**Versão:** 1.0.0

---

## 📊 Dashboard de Progresso

### Status Geral
- **Total:** 27 melhorias
- **Concluídas:** 17/27 (62.96%)
- **Em progresso:** 0/27 (0%)
- **Pendentes:** 10/27 (37.04%)

### Por Categoria
- [x] **Segurança:** 6/6 (100%) ✅
- [x] **Performance:** 3/3 (100%) ✅
- [x] **Qualidade de Código:** 3/3 (100%) ✅
- [ ] **Funcionalidades:** 0/3 - [Seção 4](#4-funcionalidades)
- [ ] **Observabilidade:** 2/4 (50%) - [Seção 5](#5-observabilidade)
- [ ] **DevOps:** 1/2 (50%) - [Seção 6](#6-devops)
- [ ] **Testes:** 2/3 (66.67%) - [Seção 7](#7-testes)
- [ ] **Documentação:** 0/3 - [Seção 8](#8-documentação)

---

## 🎯 Ordem Recomendada de Implementação

### ✅ Fase 1 - Segurança & Performance & Qualidade (Completa)
- ✅ Rate Limiting, Security Headers, CORS, Input Sanitization
- ✅ Cache, Compressão, Otimização de Algoritmos
- ✅ Error Handling, Logging, Validação com Zod

### 🎯 Fase 2 - Testes (Prioridade Alta)
1. [#7.1](#71-testes-unitários-jest) Testes Unitários - **CRÍTICO**
2. [#7.2](#72-testes-de-integração) Testes de Integração
3. [#7.3](#73-testes-e2e) Testes E2E

### 🎯 Fase 3 - Observabilidade (Prioridade Alta)
1. [#5.1](#51-health-check-completo) Health Check Completo - **CRÍTICO**
2. [#5.2](#52-métricas-prometheus) Métricas Prometheus
3. [#5.3](#53-request-id-tracking) Request ID Tracking
4. [#5.4](#54-apm-básico) APM Básico

### 🎯 Fase 4 - DevOps (Prioridade Média)
1. [#6.1](#61-cicd-github-actions) CI/CD GitHub Actions
2. [#6.2](#62-environment-configs) Environment Configs

### 🎯 Fase 5 - Funcionalidades (Prioridade Média)
1. [#4.1](#41-preview-visual-do-nesting) Preview Visual do Nesting
2. [#4.3](#43-suporte-a-múltiplas-chapas) Suporte a Múltiplas Chapas
3. [#4.2](#42-presets-de-configuração) Presets de Configuração

### 🎯 Fase 6 - Documentação (Prioridade Baixa)
1. [#8.1](#81-openapiswagger) OpenAPI/Swagger
2. [#8.2](#82-readme-técnico-completo) README Técnico
3. [#8.3](#83-guia-de-contribuição) Guia de Contribuição

---

# 1. Segurança

## 1.1. Rate Limiting
- [x] **Status:** ✅ Concluído em 2025-12-05
- **Prioridade:** 🔴 CRÍTICA
- **Tempo estimado:** 30 minutos
- **Arquivos afetados:** `src/server.ts`, `src/middleware/rate-limit.ts` (novo)

### Descrição
Adicionar proteção contra abuso de API (força bruta, DDoS).

### Passo a Passo

**1. Instalar dependência:**
```bash
npm install express-rate-limit
```

**2. Criar arquivo `src/middleware/rate-limit.ts`:**
```typescript
import rateLimit from 'express-rate-limit';

// Rate limiter geral para toda API
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
  message: 'Muitas requisições deste IP. Tente novamente em 15 minutos.',
  standardHeaders: true, // Retorna info nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita headers `X-RateLimit-*`
});

// Rate limiter específico para geração de G-code (mais restritivo)
export const gcodeGenerationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 gerações por minuto
  message: 'Limite de geração de G-code excedido. Aguarde 1 minuto.',
  skipSuccessfulRequests: false,
});

// Rate limiter para validação (intermediário)
export const validationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 validações por minuto
  message: 'Limite de validação excedido. Aguarde 1 minuto.',
});
```

**3. Aplicar em `src/server.ts`:**

Adicionar imports no topo:
```typescript
import { apiLimiter, gcodeGenerationLimiter, validationLimiter } from './middleware/rate-limit';
```

Aplicar ANTES das rotas (após `app.use(cors())` e `app.use(express.json())`):
```typescript
// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting (ADICIONAR AQUI)
app.use('/api', apiLimiter);

// Rotas
app.use('/api', gcodeRoutes);
```

**4. Adicionar limiters específicos em `src/routes/gcode.routes.ts`:**

Adicionar import no topo:
```typescript
import { gcodeGenerationLimiter, validationLimiter } from '../middleware/rate-limit';
```

Adicionar antes de cada rota:
```typescript
router.post('/gcode/generate', gcodeGenerationLimiter, (req, res) => {
  // ... código existente
});

router.post('/gcode/validate', validationLimiter, (req, res) => {
  // ... código existente
});
```

### Teste de Validação
```bash
# Testar rate limiting (deve retornar 429 após 10 requests)
for i in {1..15}; do
  curl -X POST http://localhost:3001/api/gcode/generate \
    -H "Content-Type: application/json" \
    -d '{"pecas":[{"largura":100,"altura":100,"tipoCorte":"externo","id":"1"}]}'
  echo "Request $i"
done

# Deve retornar erro 429 após request 10
```

### Critério de Conclusão
- [x] Dependência instalada
- [x] Arquivo `rate-limit.ts` criado
- [x] Limiters aplicados em `server.ts`
- [x] Limiters aplicados em rotas específicas
- [x] Teste passou (retorna 429 após limite)

---

## 1.2. Security Headers (Helmet)
- [x] **Status:** ✅ Concluído em 2025-12-05
- **Prioridade:** 🔴 CRÍTICA
- **Tempo estimado:** 15 minutos
- **Arquivos afetados:** `src/server.ts`

### Descrição
Adicionar headers de segurança padrão (XSS, clickjacking, etc.).

### Passo a Passo

**1. Instalar dependência:**
```bash
npm install helmet
```

**2. Adicionar em `src/server.ts`:**

Import no topo:
```typescript
import helmet from 'helmet';
```

Aplicar logo após criação do `app` (antes de CORS):
```typescript
const app = express();

// Security headers (ADICIONAR AQUI)
app.use(helmet({
  contentSecurityPolicy: false, // API não precisa CSP
  crossOriginEmbedderPolicy: false, // Permitir embeds
}));

// Middlewares
app.use(cors());
```

### Teste de Validação
```bash
# Verificar headers de segurança
curl -I http://localhost:3001/health

# Deve conter headers:
# X-DNS-Prefetch-Control: off
# X-Frame-Options: SAMEORIGIN
# Strict-Transport-Security: max-age=15552000; includeSubDomains
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 0
```

### Critério de Conclusão
- [x] Dependência instalada
- [x] Helmet aplicado em `server.ts`
- [x] Headers de segurança presentes na resposta
- [x] Health check retorna 200

---

## 1.3. CORS Restritivo
- [x] **Status:** ✅ Concluído em 2025-12-05
- **Prioridade:** 🟡 MÉDIA
- **Tempo estimado:** 20 minutos
- **Arquivos afetados:** `src/server.ts`, `.env.example`

### Descrição
Configurar CORS para aceitar apenas origens permitidas.

### Passo a Passo

**1. Atualizar `.env.example`:**
```env
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,https://cnc-builder.vercel.app
```

**2. Criar arquivo `.env` (se não existe):**
```bash
cp .env.example .env
```

**3. Substituir `app.use(cors())` em `src/server.ts`:**

```typescript
// ANTES:
app.use(cors());

// DEPOIS:
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'https://cnc-builder.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requests sem origin (Postman, curl, etc)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origem bloqueada - ${origin}`);
      callback(new Error('Origem não permitida pelo CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 horas de cache para preflight
}));
```

### Teste de Validação
```bash
# Testar origem permitida
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost:3001/api/gcode/generate

# Deve retornar: Access-Control-Allow-Origin: http://localhost:3000

# Testar origem bloqueada
curl -H "Origin: http://malicious-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost:3001/api/gcode/generate

# Não deve retornar Access-Control-Allow-Origin
```

### Critério de Conclusão
- [x] `.env.example` atualizado
- [x] `.env` criado
- [x] CORS configurado em `server.ts`
- [x] Teste com origem permitida passou
- [x] Teste com origem bloqueada falhou (correto)

---

## 1.4. Input Sanitization
- [x] **Status:** ✅ Concluído em 2025-12-05
- **Prioridade:** 🟡 MÉDIA
- **Tempo estimado:** 30 minutos
- **Arquivos afetados:** `src/middleware/sanitize.ts` (novo), `src/server.ts`

### Descrição
Sanitizar strings de entrada para prevenir XSS e injection.

### Passo a Passo

**1. Instalar dependências:**
```bash
npm install validator
npm install --save-dev @types/validator
```

**2. Criar `src/middleware/sanitize.ts`:**
```typescript
import validator from 'validator';

/**
 * Sanitiza recursivamente objetos, arrays e strings
 * Remove caracteres perigosos de HTML/SQL/JS
 */
export function sanitizeInput(input: any): any {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    // Remove tags HTML e caracteres perigosos
    return validator.escape(input.trim());
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }

  if (typeof input === 'object') {
    const sanitized: any = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        sanitized[key] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }

  // Números, booleans, etc passam direto
  return input;
}

/**
 * Middleware Express para sanitizar req.body
 */
export function sanitizeMiddleware(req: any, _res: any, next: any) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeInput(req.body);
  }
  next();
}
```

**3. Aplicar em `src/server.ts`:**

Import:
```typescript
import { sanitizeMiddleware } from './middleware/sanitize';
```

Aplicar após `express.json()`:
```typescript
app.use(express.json({ limit: '10mb' }));
app.use(sanitizeMiddleware); // ADICIONAR AQUI
```

### Teste de Validação
```bash
# Testar sanitização de HTML
curl -X POST http://localhost:3001/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{
    "pecas": [{
      "largura": 100,
      "altura": 100,
      "tipoCorte": "externo",
      "id": "1",
      "nome": "<script>alert(\"XSS\")</script>"
    }]
  }'

# No log do servidor, "nome" deve estar escapado como:
# &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;
```

### Critério de Conclusão
- [x] Dependências instaladas
- [x] Arquivo `sanitize.ts` criado
- [x] Middleware aplicado em `server.ts`
- [x] HTML é escapado corretamente
- [x] API continua funcionando normalmente

---

## 1.5. Request Size Limit
- [x] **Status:** ✅ Concluído em 2025-12-05
- **Prioridade:** 🟢 BAIXA
- **Tempo estimado:** 10 minutos
- **Arquivos afetados:** `src/server.ts`, `src/routes/gcode.routes.ts`

### Descrição
Limitar tamanho de requests para prevenir DoS.

### Passo a Passo

**1. Reduzir limite global em `src/server.ts`:**
```typescript
// ANTES:
app.use(express.json({ limit: '10mb' }));

// DEPOIS:
app.use(express.json({ limit: '2mb' }));
```

**2. Adicionar validação de arrays em `src/routes/gcode.routes.ts`:**

No endpoint `/gcode/generate`, adicionar após validação de `pecas`:
```typescript
// Validação básica
if (!pecas || !Array.isArray(pecas) || pecas.length === 0) {
  res.status(400).json({
    error: 'Parâmetro "pecas" é obrigatório e deve ser array não vazio',
  });
  return;
}

// ADICIONAR AQUI:
if (pecas.length > 1000) {
  res.status(400).json({
    error: 'Máximo de 1000 peças por request',
    currentCount: pecas.length,
  });
  return;
}
```

Repetir para endpoint `/gcode/validate`.

### Teste de Validação
```bash
# Testar payload muito grande (deve retornar 413)
dd if=/dev/zero bs=1M count=3 | curl -X POST http://localhost:3001/api/gcode/generate \
  -H "Content-Type: application/json" \
  --data-binary @-

# Testar array com 1001 peças (deve retornar 400)
# (gerar script ou usar Postman)
```

### Critério de Conclusão
- [x] Limite reduzido para 2MB
- [x] Validação de array adicionada
- [x] Payloads grandes retornam 413
- [x] Arrays grandes retornam 400

---

## 1.6. Timeout de Requests
- [x] **Status:** ✅ Concluído em 2025-12-05
- **Prioridade:** 🟢 BAIXA
- **Tempo estimado:** 15 minutos
- **Arquivos afetados:** `src/routes/gcode.routes.ts`

### Descrição
Adicionar timeout para prevenir requests infinitos.

### Passo a Passo

**1. Criar função helper no início de `src/routes/gcode.routes.ts`:**
```typescript
/**
 * Middleware para adicionar timeout a requests
 */
function withTimeout(timeoutMs: number) {
  return (req: any, res: any, next: any) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: 'Request timeout',
          message: `Processamento excedeu ${timeoutMs / 1000} segundos`,
        });
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timer));
    next();
  };
}
```

**2. Aplicar nas rotas:**
```typescript
router.post('/gcode/generate', withTimeout(30000), (req, res) => {
  // ... código existente
});

router.post('/gcode/validate', withTimeout(10000), (req, res) => {
  // ... código existente
});
```

### Teste de Validação
```bash
# Simular processamento lento (adicionar delay temporário no código)
# Deve retornar 504 após timeout
```

### Critério de Conclusão
- [x] Helper `withTimeout` criado
- [x] Timeout aplicado em ambas rotas
- [x] Request longo retorna 504

---

# 2. Performance

## 2.1. Cache de Validação
- [x] **Status:** ✅ Concluído em 2025-12-05
- **Prioridade:** 🟡 MÉDIA
- **Tempo estimado:** 45 minutos
- **Arquivos afetados:** `src/services/cache.ts` (novo), `src/routes/gcode.routes.ts`

### Descrição
Cachear resultados de validação para evitar processamento repetido.

### Passo a Passo

**1. Instalar dependência:**
```bash
npm install node-cache
```

**2. Criar `src/services/cache.ts`:**
```typescript
import NodeCache from 'node-cache';

/**
 * Cache de validações
 * TTL: 5 minutos
 * Max keys: 1000 configs
 */
export const validationCache = new NodeCache({
  stdTTL: 300, // 5 minutos
  checkperiod: 60, // Verifica items expirados a cada 1 minuto
  maxKeys: 1000, // Máximo 1000 configs em cache
  useClones: false, // Performance (não clona objetos)
});

/**
 * Gera chave de cache a partir dos dados
 */
export function getCacheKey(data: any): string {
  return JSON.stringify(data);
}

/**
 * Retorna estatísticas do cache
 */
export function getCacheStats() {
  return validationCache.getStats();
}
```

**3. Usar em `src/routes/gcode.routes.ts`:**

Import:
```typescript
import { validationCache, getCacheKey } from '../services/cache';
```

Modificar rota `/gcode/validate`:
```typescript
router.post('/gcode/validate', validationLimiter, (req, res) => {
  try {
    const { pecas, configChapa, configCorte, configFerramenta, metodoNesting = 'guillotine' as MetodoNesting } = req.body;

    // Validação básica
    if (!pecas || !Array.isArray(pecas) || pecas.length === 0) {
      res.status(400).json({ error: 'Parâmetro "pecas" é obrigatório' });
      return;
    }

    // ADICIONAR CACHE AQUI:
    const cacheKey = getCacheKey({ pecas, configChapa, configCorte, configFerramenta, metodoNesting });
    const cached = validationCache.get(cacheKey);

    if (cached) {
      console.log('✅ Cache HIT');
      res.json(cached);
      return;
    }

    console.log('❌ Cache MISS');

    // ... resto do código existente (mescla, nesting, validação)

    // ADICIONAR ANTES DE res.json():
    validationCache.set(cacheKey, result);

    res.json(result);
  } catch (error: any) {
    // ... tratamento de erro existente
  }
});
```

**4. Adicionar endpoint de estatísticas (opcional):**
```typescript
import { getCacheStats } from '../services/cache';

router.get('/cache/stats', (_req, res) => {
  res.json(getCacheStats());
});
```

### Teste de Validação
```bash
# Request 1 (MISS)
curl -X POST http://localhost:3001/api/gcode/validate \
  -H "Content-Type: application/json" \
  -d '{"pecas":[{"largura":100,"altura":100,"tipoCorte":"externo","id":"1"}]}'
# Log deve mostrar: ❌ Cache MISS

# Request 2 (HIT - mesmos dados)
curl -X POST http://localhost:3001/api/gcode/validate \
  -H "Content-Type: application/json" \
  -d '{"pecas":[{"largura":100,"altura":100,"tipoCorte":"externo","id":"1"}]}'
# Log deve mostrar: ✅ Cache HIT

# Verificar stats
curl http://localhost:3001/api/cache/stats
```

### Critério de Conclusão
- [x] Dependência instalada
- [x] Arquivo `cache.ts` criado
- [x] Cache implementado em `/validate`
- [x] Cache HIT funciona
- [x] Cache MISS funciona
- [x] Endpoint de stats retorna dados

---

## 2.2. Compressão de Respostas
- [x] **Status:** ✅ Concluído em 2025-12-05
- **Prioridade:** 🟡 MÉDIA
- **Tempo estimado:** 15 minutos
- **Arquivos afetados:** `src/server.ts`

### Descrição
Comprimir respostas HTTP com gzip para reduzir tráfego.

### Passo a Passo

**1. Instalar dependências:**
```bash
npm install compression
npm install --save-dev @types/compression
```

**2. Adicionar em `src/server.ts`:**

Import:
```typescript
import compression from 'compression';
```

Aplicar após helmet, antes de CORS:
```typescript
app.use(helmet({ ... }));

// Compressão de respostas (ADICIONAR AQUI)
app.use(compression({
  filter: (req, res) => {
    // Não comprimir se cliente enviou header x-no-compression
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Comprimir apenas responses maiores que 1KB
    return compression.filter(req, res);
  },
  level: 6, // Nível de compressão (1-9, 6 é padrão equilibrado)
  threshold: 1024, // Só comprime se > 1KB
}));

app.use(cors({ ... }));
```

### Teste de Validação
```bash
# Gerar G-code grande e verificar compressão
curl -X POST http://localhost:3001/api/gcode/generate \
  -H "Content-Type: application/json" \
  -H "Accept-Encoding: gzip" \
  -d '{"pecas":[
    {"largura":100,"altura":100,"tipoCorte":"externo","id":"1"},
    {"largura":100,"altura":100,"tipoCorte":"externo","id":"2"},
    {"largura":100,"altura":100,"tipoCorte":"externo","id":"3"}
  ]}' \
  --compressed -v 2>&1 | grep -i "content-encoding"

# Deve retornar: content-encoding: gzip
```

### Critério de Conclusão
- [x] Dependências instaladas
- [x] Compression aplicado
- [x] Header `content-encoding: gzip` presente
- [x] Resposta é descomprimida corretamente pelo cliente

---

## 2.3. Otimização de Algoritmos
- [x] **Status:** ✅ Concluído em 2025-12-05
- **Prioridade:** 🟢 BAIXA
- **Tempo estimado:** 2 horas
- **Arquivos afetados:** `src/services/nesting-algorithm.ts`

### Descrição
Otimizar algoritmos de nesting para lotes grandes.

### Passo a Passo

**1. Early exit em `posicionarPecas` (todos algoritmos):**

Adicionar no início da função principal:
```typescript
// Se não há peças, retorna vazio imediatamente
if (pecas.length === 0) {
  return {
    posicionadas: [],
    naoCouberam: [],
    metricas: { areaUtilizada: 0, eficiencia: 0, tempo: 0 },
  };
}
```

**2. Limitar retângulos livres em Guillotine:**

Em `posicionarPecasGuillotine`, adicionar:
```typescript
// Limita número de retângulos livres para evitar explosão de memória
const MAX_FREE_RECTS = 100;

// Após adicionar novos retângulos:
if (retangulosLivres.length > MAX_FREE_RECTS) {
  // Mescla retângulos pequenos
  retangulosLivres.sort((a, b) => (b.largura * b.altura) - (a.largura * a.altura));
  retangulosLivres = retangulosLivres.slice(0, MAX_FREE_RECTS);
}
```

**3. Adicionar modo "fast" (opcional):**
```typescript
// Em types/index.ts, adicionar:
export type MetodoNesting = 'greedy' | 'shelf' | 'guillotine' | 'greedy-fast' | 'shelf-fast' | 'guillotine-fast';

// Implementar versões "fast" que pulam otimizações custosas
```

### Teste de Validação
```bash
# Benchmark com 500 peças
node -e "
const pecas = Array.from({length: 500}, (_, i) => ({
  largura: 100,
  altura: 100,
  tipoCorte: 'externo',
  id: String(i)
}));
const inicio = Date.now();
// ... chamar API ...
console.log('Tempo:', Date.now() - inicio, 'ms');
"

# Deve ser < 2000ms
```

### Critério de Conclusão
- [x] Early exit implementado
- [x] Limite de retângulos implementado (MAX_FREE_RECTS = 100)
- [x] 500 peças processadas em < 2s (54ms medido)

---

# 3. Qualidade de Código

## 3.1. Error Handling Padronizado
- [x] **Status:** ✅ Concluído em 2025-12-05
- **Prioridade:** 🟡 MÉDIA
- **Tempo estimado:** 1 hora
- **Arquivos afetados:** `src/middleware/error-handler.ts` (novo), `src/server.ts`, `src/routes/gcode.routes.ts`

### Descrição
Criar sistema de tratamento de erros consistente.

### Passo a Passo

**1. Criar `src/middleware/error-handler.ts`:**
```typescript
import type { Request, Response, NextFunction } from 'express';

/**
 * Classe de erro customizada
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Mantém stack trace correto
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware de tratamento de erros global
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Erro operacional (esperado)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      requestId: req.headers['x-request-id'],
      timestamp: new Date().toISOString(),
    });
  }

  // Erro não esperado
  console.error('❌ ERRO NÃO TRATADO:', err);

  return res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    requestId: req.headers['x-request-id'],
    timestamp: new Date().toISOString(),
  });
}

/**
 * Erros comuns pré-definidos
 */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(422, message);
  }
}
```

**2. Aplicar em `src/server.ts`:**

Import:
```typescript
import { errorHandler } from './middleware/error-handler';
```

Adicionar NO FINAL, após todas rotas:
```typescript
// Rotas
app.use('/api', gcodeRoutes);

// Error handler global (ADICIONAR AQUI - SEMPRE POR ÚLTIMO)
app.use(errorHandler);

app.listen(PORT, () => {
  // ...
});
```

**3. Usar nas rotas `src/routes/gcode.routes.ts`:**

Import:
```typescript
import { AppError, BadRequestError, ValidationError } from '../middleware/error-handler';
```

Substituir validações:
```typescript
// ANTES:
if (!pecas || !Array.isArray(pecas) || pecas.length === 0) {
  res.status(400).json({ error: 'Parâmetro "pecas" é obrigatório' });
  return;
}

// DEPOIS:
if (!pecas || !Array.isArray(pecas) || pecas.length === 0) {
  throw new BadRequestError('Parâmetro "pecas" é obrigatório e deve ser array não vazio');
}

if (pecas.length > 1000) {
  throw new BadRequestError(`Máximo de 1000 peças por request (recebido: ${pecas.length})`);
}

if (!validationResult.valid) {
  throw new ValidationError('Configurações inválidas');
}
```

**4. Remover try/catch redundantes:**

Substituir blocos try/catch que apenas fazem `res.status(500)` por throw direto.

### Teste de Validação
```bash
# Testar erro 400
curl -X POST http://localhost:3001/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{"pecas":[]}'

# Deve retornar JSON estruturado com requestId e timestamp

# Testar erro 500 (forçar erro no código temporariamente)
```

### Critério de Conclusão
- [x] Arquivo `error-handler.ts` criado
- [x] Middleware aplicado em `server.ts`
- [x] Erros customizados usados nas rotas
- [x] Respostas de erro consistentes
- [x] Stack trace não vaza em produção

---

## 3.2. Logging Estruturado
- [x] **Status:** ✅ Concluído em 2025-12-05
- **Prioridade:** 🟡 MÉDIA
- **Tempo estimado:** 45 minutos
- **Arquivos afetados:** `src/utils/logger.ts` (novo), `src/server.ts`, `src/routes/gcode.routes.ts`

### Descrição
Substituir console.log por logging estruturado.

### Passo a Passo

**1. Instalar Winston:**
```bash
npm install winston
```

**2. Criar `src/utils/logger.ts`:**
```typescript
import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cnc-builder-api' },
  transports: [
    // Console (sempre ativo)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),

    // Arquivo de erros (apenas produção)
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
          }),
        ]
      : []),
  ],
});

// Stream para integração com Express/Morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
```

**3. Criar pasta de logs (produção):**
```bash
mkdir -p logs
echo "logs/" >> .gitignore
```

**4. Substituir console.log em `src/server.ts`:**
```typescript
import { logger } from './utils/logger';

// ANTES:
console.log(`🚀 API rodando em http://localhost:${PORT}`);

// DEPOIS:
logger.info('🚀 API rodando', { port: PORT, env: process.env.NODE_ENV });
```

**5. Substituir em `src/routes/gcode.routes.ts`:**
```typescript
import { logger } from '../utils/logger';

// Logs de cache:
logger.info('✅ Cache HIT', { endpoint: '/validate' });
logger.info('❌ Cache MISS', { endpoint: '/validate' });

// Logs de erro:
logger.error('Erro ao gerar G-code', {
  error: error.message,
  stack: error.stack,
  requestBody: req.body,
});
```

**6. Adicionar em `error-handler.ts`:**
```typescript
import { logger } from '../utils/logger';

// No errorHandler:
logger.error('Erro não tratado', {
  error: err.message,
  stack: err.stack,
  url: req.url,
  method: req.method,
});
```

### Teste de Validação
```bash
# Verificar logs coloridos no console
npm run dev

# Verificar arquivo de logs (produção)
NODE_ENV=production npm start
cat logs/combined.log
```

### Critério de Conclusão
- [x] Winston instalado
- [x] Logger criado
- [x] Todos console.log substituídos
- [x] Logs estruturados em JSON
- [x] Arquivos de log criados em produção

---

## 3.3. Validação com Zod
- [x] **Status:** ✅ Concluído em 2025-12-05
- **Prioridade:** 🟢 BAIXA
- **Tempo estimado:** 1.5 horas
- **Arquivos afetados:** `src/schemas/` (novo), `src/routes/gcode.routes.ts`

### Descrição
Usar Zod para validação de tipos em runtime.

### Passo a Passo

**1. Instalar Zod:**
```bash
npm install zod
```

**2. Criar `src/schemas/gcode.schema.ts`:**
```typescript
import { z } from 'zod';

export const PecaSchema = z.object({
  largura: z.number().positive('Largura deve ser positiva'),
  altura: z.number().positive('Altura deve ser positiva'),
  tipoCorte: z.enum(['externo', 'interno', 'na-linha']),
  id: z.string().min(1, 'ID obrigatório'),
  nome: z.string().optional(),
  ignorada: z.boolean().optional(),
  numeroOriginal: z.number().optional(),
});

export const ConfigChapaSchema = z.object({
  largura: z.number().positive(),
  altura: z.number().positive(),
  espessura: z.number().positive(),
});

export const ConfigCorteSchema = z.object({
  profundidade: z.number().positive(),
  espacamento: z.number().min(0),
  profundidadePorPassada: z.number().positive(),
  feedrate: z.number().positive(),
  plungeRate: z.number().positive(),
  rapidsSpeed: z.number().positive(),
  spindleSpeed: z.number().positive(),
  usarRampa: z.boolean(),
  anguloRampa: z.number().min(1).max(10),
  aplicarRampaEm: z.enum(['primeira-passada', 'todas-passadas']),
  usarMesmoEspacamentoBorda: z.boolean(),
  margemBorda: z.number().min(0),
});

export const ConfigFerramentaSchema = z.object({
  diametro: z.number().positive(),
  numeroFerramenta: z.number().int().positive(),
});

export const GenerateRequestSchema = z.object({
  pecas: z.array(PecaSchema).min(1, 'Pelo menos uma peça obrigatória').max(1000, 'Máximo 1000 peças'),
  configChapa: ConfigChapaSchema.partial().optional(),
  configCorte: ConfigCorteSchema.partial().optional(),
  configFerramenta: ConfigFerramentaSchema.partial().optional(),
  metodoNesting: z.enum(['greedy', 'shelf', 'guillotine']).optional(),
  incluirComentarios: z.boolean().optional(),
});

export const ValidateRequestSchema = GenerateRequestSchema.omit({ incluirComentarios: true });
```

**3. Usar nas rotas:**
```typescript
import { GenerateRequestSchema, ValidateRequestSchema } from '../schemas/gcode.schema';

router.post('/gcode/generate', (req, res) => {
  try {
    // Valida e parseia request
    const validatedData = GenerateRequestSchema.parse(req.body);

    // Agora use validatedData em vez de req.body
    const { pecas, configChapa, configCorte, ... } = validatedData;

    // ... resto do código
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Dados inválidos',
        details: error.errors,
      });
      return;
    }
    throw error;
  }
});
```

### Teste de Validação
```bash
# Testar validação
curl -X POST http://localhost:3001/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{"pecas":[{"largura":-100,"altura":100}]}'

# Deve retornar erro detalhado do Zod
```

### Critério de Conclusão
- [x] Zod instalado
- [x] Schemas criados
- [x] Validação aplicada nas rotas
- [x] Erros de validação detalhados
- [x] Tipos inferidos automaticamente

---

# 4. Funcionalidades

## 4.1. Preview Visual do Nesting
- [ ] **Status:** Pendente
- **Prioridade:** 🟡 MÉDIA
- **Tempo estimado:** 2 horas
- **Arquivos afetados:** `src/routes/gcode.routes.ts`, `src/utils/svg-generator.ts` (novo)

### Descrição
Retornar representação visual do nesting (SVG ou coordenadas) para preview no frontend.

### Passo a Passo

**1. Criar `src/utils/svg-generator.ts`:**
```typescript
import type { PecaPosicionada } from '../types';

export function generateNestingSVG(
  pecas: PecaPosicionada[],
  larguraChapa: number,
  alturaChapa: number
): string {
  const svg = `
    <svg width="${larguraChapa}" height="${alturaChapa}" xmlns="http://www.w3.org/2000/svg">
      <!-- Chapa -->
      <rect x="0" y="0" width="${larguraChapa}" height="${alturaChapa}"
            fill="none" stroke="black" stroke-width="2"/>

      <!-- Peças -->
      ${pecas.map((peca, i) => `
        <rect x="${peca.x}" y="${peca.y}"
              width="${peca.largura}" height="${peca.altura}"
              fill="rgba(100, 150, 200, 0.3)"
              stroke="blue" stroke-width="1"/>
        <text x="${peca.x + peca.largura / 2}"
              y="${peca.y + peca.altura / 2}"
              text-anchor="middle"
              font-size="12">${peca.id}</text>
      `).join('\n')}
    </svg>
  `.trim();

  return svg;
}

export function generateNestingJSON(
  pecas: PecaPosicionada[],
  larguraChapa: number,
  alturaChapa: number
) {
  return {
    chapa: { largura: larguraChapa, altura: alturaChapa },
    pecas: pecas.map(p => ({
      id: p.id,
      x: p.x,
      y: p.y,
      largura: p.largura,
      altura: p.altura,
      rotacionada: p.rotacionada,
    })),
  };
}
```

**2. Adicionar em `/gcode/validate`:**
```typescript
import { generateNestingSVG, generateNestingJSON } from '../utils/svg-generator';

// Após nesting bem-sucedido:
const resultado = {
  valid: true,
  preview: {
    svg: generateNestingSVG(resultadoNesting.posicionadas, configChapa.largura, configChapa.altura),
    json: generateNestingJSON(resultadoNesting.posicionadas, configChapa.largura, configChapa.altura),
  },
  // ... resto dos dados
};

res.json(resultado);
```

**3. Adicionar query param para formato:**
```typescript
const { format = 'json' } = req.query;

if (format === 'svg') {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
  return;
}
```

### Teste de Validação
```bash
# Testar JSON
curl -X POST http://localhost:3001/api/gcode/validate \
  -H "Content-Type: application/json" \
  -d '{"pecas":[{"largura":100,"altura":100,"tipoCorte":"externo","id":"1"}]}'

# Testar SVG
curl -X POST "http://localhost:3001/api/gcode/validate?format=svg" \
  -H "Content-Type: application/json" \
  -d '{"pecas":[{"largura":100,"altura":100,"tipoCorte":"externo","id":"1"}]}' \
  > preview.svg
```

### Critério de Conclusão
- [ ] Arquivo `svg-generator.ts` criado
- [ ] Preview SVG funciona
- [ ] Preview JSON funciona
- [ ] Query param `format` funciona
- [ ] SVG pode ser aberto em navegador

---

## 4.2. Presets de Configuração
- [ ] **Status:** Pendente
- **Prioridade:** 🟢 BAIXA
- **Tempo estimado:** 1.5 horas
- **Arquivos afetados:** `src/routes/presets.routes.ts` (novo), `src/services/presets.ts` (novo)

### Descrição
Permitir salvar/carregar presets de configuração (configChapa, configCorte, configFerramenta).

### Passo a Passo

**1. Criar `src/services/presets.ts`:**
```typescript
import fs from 'fs/promises';
import path from 'path';

const PRESETS_DIR = path.join(process.cwd(), 'data', 'presets');

export interface Preset {
  id: string;
  nome: string;
  descricao?: string;
  configChapa?: any;
  configCorte?: any;
  configFerramenta?: any;
  criadoEm: string;
  atualizadoEm: string;
}

export async function initPresetsDir() {
  await fs.mkdir(PRESETS_DIR, { recursive: true });
}

export async function listarPresets(): Promise<Preset[]> {
  const files = await fs.readdir(PRESETS_DIR);
  const presets = await Promise.all(
    files
      .filter(f => f.endsWith('.json'))
      .map(async f => {
        const content = await fs.readFile(path.join(PRESETS_DIR, f), 'utf-8');
        return JSON.parse(content);
      })
  );
  return presets;
}

export async function salvarPreset(preset: Omit<Preset, 'criadoEm' | 'atualizadoEm'>): Promise<Preset> {
  const agora = new Date().toISOString();
  const presetCompleto: Preset = {
    ...preset,
    criadoEm: agora,
    atualizadoEm: agora,
  };

  const filepath = path.join(PRESETS_DIR, `${preset.id}.json`);
  await fs.writeFile(filepath, JSON.stringify(presetCompleto, null, 2));

  return presetCompleto;
}

export async function buscarPreset(id: string): Promise<Preset | null> {
  try {
    const filepath = path.join(PRESETS_DIR, `${id}.json`);
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function deletarPreset(id: string): Promise<boolean> {
  try {
    const filepath = path.join(PRESETS_DIR, `${id}.json`);
    await fs.unlink(filepath);
    return true;
  } catch {
    return false;
  }
}
```

**2. Criar `src/routes/presets.routes.ts`:**
```typescript
import { Router } from 'express';
import { listarPresets, salvarPreset, buscarPreset, deletarPreset } from '../services/presets';
import { BadRequestError, NotFoundError } from '../middleware/error-handler';

const router = Router();

// Listar todos
router.get('/presets', async (_req, res) => {
  const presets = await listarPresets();
  res.json(presets);
});

// Buscar por ID
router.get('/presets/:id', async (req, res) => {
  const preset = await buscarPreset(req.params.id);
  if (!preset) {
    throw new NotFoundError('Preset não encontrado');
  }
  res.json(preset);
});

// Criar/atualizar
router.post('/presets', async (req, res) => {
  const { id, nome, descricao, configChapa, configCorte, configFerramenta } = req.body;

  if (!id || !nome) {
    throw new BadRequestError('Campos "id" e "nome" são obrigatórios');
  }

  const preset = await salvarPreset({
    id,
    nome,
    descricao,
    configChapa,
    configCorte,
    configFerramenta,
  });

  res.status(201).json(preset);
});

// Deletar
router.delete('/presets/:id', async (req, res) => {
  const sucesso = await deletarPreset(req.params.id);
  if (!sucesso) {
    throw new NotFoundError('Preset não encontrado');
  }
  res.status(204).send();
});

export default router;
```

**3. Registrar rotas em `src/server.ts`:**
```typescript
import presetsRoutes from './routes/presets.routes';

app.use('/api', presetsRoutes);
```

**4. Inicializar pasta na inicialização:**
```typescript
import { initPresetsDir } from './services/presets';

// No início do app:
await initPresetsDir();
```

### Teste de Validação
```bash
# Criar preset
curl -X POST http://localhost:3001/api/presets \
  -H "Content-Type: application/json" \
  -d '{
    "id": "madeira-mdf",
    "nome": "MDF 15mm",
    "configChapa": {"largura": 2750, "altura": 1850, "espessura": 15},
    "configCorte": {"profundidade": 15, "feedrate": 1500}
  }'

# Listar presets
curl http://localhost:3001/api/presets

# Buscar preset
curl http://localhost:3001/api/presets/madeira-mdf

# Deletar preset
curl -X DELETE http://localhost:3001/api/presets/madeira-mdf
```

### Critério de Conclusão
- [ ] Serviço de presets criado
- [ ] Rotas funcionando
- [ ] CRUD completo (Create, Read, Update, Delete)
- [ ] Pasta `data/presets` criada automaticamente
- [ ] Presets persistem após restart

---

## 4.3. Suporte a Múltiplas Chapas
- [ ] **Status:** Pendente
- **Prioridade:** 🟡 MÉDIA
- **Tempo estimado:** 3 horas
- **Arquivos afetados:** `src/services/nesting-algorithm.ts`, `src/routes/gcode.routes.ts`

### Descrição
Quando peças não cabem em uma chapa, dividir automaticamente em múltiplas chapas.

### Passo a Passo

**1. Modificar retorno dos algoritmos de nesting:**
```typescript
// Em src/services/nesting-algorithm.ts
export interface ResultadoNestingMultiChapa {
  chapas: Array<{
    numero: number;
    posicionadas: PecaPosicionada[];
    metricas: Metricas;
  }>;
  naoCouberam: Peca[];
  resumo: {
    totalChapas: number;
    totalPecas: number;
    eficienciaMedia: number;
  };
}

export function posicionarPecasMultiChapa(
  pecas: Peca[],
  configChapa: ConfigChapa,
  metodo: MetodoNesting = 'guillotine'
): ResultadoNestingMultiChapa {
  const chapas: ResultadoNestingMultiChapa['chapas'] = [];
  let pecasRestantes = [...pecas];
  let numeroChapa = 1;

  while (pecasRestantes.length > 0) {
    // Tentar posicionar peças restantes
    const resultado = posicionarPecas(pecasRestantes, configChapa, metodo);

    // Se nada coube, parar (peças muito grandes)
    if (resultado.posicionadas.length === 0) {
      return {
        chapas,
        naoCouberam: pecasRestantes,
        resumo: {
          totalChapas: chapas.length,
          totalPecas: chapas.reduce((sum, c) => sum + c.posicionadas.length, 0),
          eficienciaMedia: chapas.reduce((sum, c) => sum + c.metricas.eficiencia, 0) / chapas.length,
        },
      };
    }

    // Adicionar chapa
    chapas.push({
      numero: numeroChapa++,
      posicionadas: resultado.posicionadas,
      metricas: resultado.metricas,
    });

    // Atualizar peças restantes
    pecasRestantes = resultado.naoCouberam;
  }

  return {
    chapas,
    naoCouberam: [],
    resumo: {
      totalChapas: chapas.length,
      totalPecas: pecas.length,
      eficienciaMedia: chapas.reduce((sum, c) => sum + c.metricas.eficiencia, 0) / chapas.length,
    },
  };
}
```

**2. Adicionar endpoint específico:**
```typescript
// Em src/routes/gcode.routes.ts
router.post('/gcode/generate-multi', async (req, res) => {
  const { pecas, configChapa, configCorte, configFerramenta, metodoNesting } = req.body;

  // Validações...

  const resultado = posicionarPecasMultiChapa(pecas, configChapa, metodoNesting);

  // Gerar G-code para cada chapa
  const gcodesPorChapa = resultado.chapas.map(chapa => ({
    numero: chapa.numero,
    gcode: gerarGCode(chapa.posicionadas, configChapa, configCorte, configFerramenta),
    metricas: chapa.metricas,
  }));

  res.json({
    chapas: gcodesPorChapa,
    naoCouberam: resultado.naoCouberam,
    resumo: resultado.resumo,
  });
});
```

### Teste de Validação
```bash
# Testar com muitas peças (forçar múltiplas chapas)
curl -X POST http://localhost:3001/api/gcode/generate-multi \
  -H "Content-Type: application/json" \
  -d '{
    "pecas": [/* 100 peças */],
    "configChapa": {"largura": 500, "altura": 500, "espessura": 15}
  }'

# Deve retornar múltiplas chapas
```

### Critério de Conclusão
- [ ] Função `posicionarPecasMultiChapa` criada
- [ ] Endpoint `/generate-multi` funciona
- [ ] Peças são divididas corretamente
- [ ] G-code gerado para cada chapa
- [ ] Resumo estatístico correto

---

# 5. Observabilidade

## 5.1. Health Check Completo
- [x] **Status:** ✅ Concluído em 2025-12-06
- **Prioridade:** 🔴 CRÍTICA
- **Tempo estimado:** 45 minutos
- **Arquivos afetados:** `src/routes/health.routes.ts` (novo), `src/server.ts`

### Descrição
Endpoint robusto de health check com métricas de sistema.

### Passo a Passo

**1. Criar `src/routes/health.routes.ts`:**
```typescript
import { Router } from 'express';
import os from 'os';

const router = Router();
const startTime = Date.now();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  system: {
    platform: string;
    nodeVersion: string;
    cpuUsage: number;
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    loadAverage: number[];
  };
  cache?: {
    keys: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
}

// Health check básico (para load balancers)
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Health check detalhado
router.get('/health/detailed', async (_req, res) => {
  const uptime = (Date.now() - startTime) / 1000;
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const usedMem = totalMem - os.freemem();

  // Calcular CPU usage
  const cpuUsage = process.cpuUsage();
  const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000 / uptime * 100;

  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime,
    system: {
      platform: `${os.platform()} ${os.arch()}`,
      nodeVersion: process.version,
      cpuUsage: Math.round(cpuPercent * 100) / 100,
      memoryUsage: {
        used: Math.round(usedMem / 1024 / 1024),
        total: Math.round(totalMem / 1024 / 1024),
        percentage: Math.round((usedMem / totalMem) * 100 * 100) / 100,
      },
      loadAverage: os.loadavg(),
    },
  };

  // Adicionar stats de cache se disponível
  try {
    const { getCacheStats } = await import('../services/cache');
    const stats = getCacheStats();
    health.cache = {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits / (stats.hits + stats.misses) * 100 || 0,
    };
  } catch {
    // Cache não disponível
  }

  // Determinar status
  if (health.system.memoryUsage.percentage > 90 || health.system.cpuUsage > 90) {
    health.status = 'unhealthy';
    res.status(503);
  } else if (health.system.memoryUsage.percentage > 75 || health.system.cpuUsage > 75) {
    health.status = 'degraded';
  }

  res.json(health);
});

// Readiness check (para Kubernetes)
router.get('/ready', (_req, res) => {
  // Verificar dependências críticas aqui (DB, etc)
  const ready = true;
  res.status(ready ? 200 : 503).json({ ready });
});

// Liveness check (para Kubernetes)
router.get('/live', (_req, res) => {
  res.json({ alive: true });
});

export default router;
```

**2. Registrar em `src/server.ts`:**
```typescript
import healthRoutes from './routes/health.routes';

// ANTES das rotas /api
app.use(healthRoutes);
```

### Teste de Validação
```bash
# Health básico
curl http://localhost:3001/health

# Health detalhado
curl http://localhost:3001/health/detailed

# Readiness
curl http://localhost:3001/ready

# Liveness
curl http://localhost:3001/live
```

### Critério de Conclusão
- [x] Arquivo `health.routes.ts` criado
- [x] Endpoint `/health` retorna status
- [x] Endpoint `/health/detailed` retorna métricas completas
- [x] Status muda para degraded/unhealthy quando apropriado
- [x] Stats de cache incluídos quando disponível

---

## 5.2. Métricas Prometheus
- [ ] **Status:** Pendente
- **Prioridade:** 🟡 MÉDIA
- **Tempo estimado:** 1.5 horas
- **Arquivos afetados:** `src/middleware/metrics.ts` (novo), `src/server.ts`

### Descrição
Expor métricas no formato Prometheus para monitoramento.

### Passo a Passo

**1. Instalar dependências:**
```bash
npm install prom-client
```

**2. Criar `src/middleware/metrics.ts`:**
```typescript
import promClient from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

// Registrar métricas padrão (CPU, memória, etc)
promClient.collectDefaultMetrics({ prefix: 'cnc_builder_' });

// Contadores customizados
export const httpRequestsTotal = new promClient.Counter({
  name: 'cnc_builder_http_requests_total',
  help: 'Total de requisições HTTP',
  labelNames: ['method', 'route', 'status'],
});

export const httpRequestDuration = new promClient.Histogram({
  name: 'cnc_builder_http_request_duration_seconds',
  help: 'Duração das requisições HTTP',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const gcodeGenerationTotal = new promClient.Counter({
  name: 'cnc_builder_gcode_generation_total',
  help: 'Total de gerações de G-code',
  labelNames: ['status', 'metodo_nesting'],
});

export const gcodeGenerationDuration = new promClient.Histogram({
  name: 'cnc_builder_gcode_generation_duration_seconds',
  help: 'Duração da geração de G-code',
  labelNames: ['metodo_nesting'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

export const nestingEfficiency = new promClient.Gauge({
  name: 'cnc_builder_nesting_efficiency_percent',
  help: 'Eficiência do nesting (%)',
  labelNames: ['metodo'],
});

// Middleware para coletar métricas HTTP
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status: res.statusCode,
    });

    httpRequestDuration.observe(
      { method: req.method, route, status: res.statusCode },
      duration
    );
  });

  next();
}

// Endpoint de métricas
export async function metricsEndpoint(_req: Request, res: Response) {
  res.setHeader('Content-Type', promClient.register.contentType);
  const metrics = await promClient.register.metrics();
  res.send(metrics);
}
```

**3. Aplicar em `src/server.ts`:**
```typescript
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics';

// Aplicar após helmet, antes de rotas
app.use(metricsMiddleware);

// Endpoint de métricas
app.get('/metrics', metricsEndpoint);
```

**4. Instrumentar rotas específicas:**
```typescript
// Em src/routes/gcode.routes.ts
import { gcodeGenerationTotal, gcodeGenerationDuration, nestingEfficiency } from '../middleware/metrics';

router.post('/gcode/generate', async (req, res) => {
  const timer = gcodeGenerationDuration.startTimer({ metodo_nesting: metodoNesting });

  try {
    // ... geração de G-code ...

    gcodeGenerationTotal.inc({ status: 'success', metodo_nesting: metodoNesting });
    nestingEfficiency.set({ metodo: metodoNesting }, resultadoNesting.metricas.eficiencia);

    timer();
    res.json(resultado);
  } catch (error) {
    gcodeGenerationTotal.inc({ status: 'error', metodo_nesting: metodoNesting });
    timer();
    throw error;
  }
});
```

### Teste de Validação
```bash
# Verificar métricas
curl http://localhost:3001/metrics

# Deve retornar métricas no formato Prometheus:
# cnc_builder_http_requests_total{method="POST",route="/api/gcode/generate",status="200"} 5
# cnc_builder_gcode_generation_duration_seconds_sum 2.5
```

### Critério de Conclusão
- [ ] prom-client instalado
- [ ] Métricas customizadas criadas
- [ ] Middleware aplicado
- [ ] Endpoint `/metrics` funciona
- [ ] Métricas de geração instrumentadas

---

## 5.3. Request ID Tracking
- [x] **Status:** ✅ Concluído em 2025-12-06
- **Prioridade:** 🟢 BAIXA
- **Tempo estimado:** 30 minutos
- **Arquivos afetados:** `src/middleware/request-id.ts` (novo), `src/server.ts`, `src/utils/logger.ts`

### Descrição
Adicionar ID único a cada request para rastreamento em logs.

### Passo a Passo

**1. Criar `src/middleware/request-id.ts`:**
```typescript
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Usa header existente ou gera novo
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}
```

**2. Aplicar em `src/server.ts`:**
```typescript
import { requestIdMiddleware } from './middleware/request-id';

// Logo após helmet
app.use(requestIdMiddleware);
```

**3. Atualizar logger para incluir request ID:**
```typescript
// Em src/utils/logger.ts
import type { Request } from 'express';

export function logWithRequest(req: Request, level: string, message: string, meta?: any) {
  logger.log(level, message, {
    requestId: req.id,
    ...meta,
  });
}
```

**4. Usar nos logs de rotas:**
```typescript
import { logWithRequest } from '../utils/logger';

router.post('/gcode/generate', (req, res) => {
  logWithRequest(req, 'info', 'Iniciando geração de G-code', {
    numPecas: pecas.length,
    metodo: metodoNesting,
  });

  // ...
});
```

### Teste de Validação
```bash
# Enviar request com ID customizado
curl -H "X-Request-ID: test-123" http://localhost:3001/api/gcode/validate \
  -H "Content-Type: application/json" \
  -d '{"pecas":[{"largura":100,"altura":100,"tipoCorte":"externo","id":"1"}]}'

# Verificar header de resposta
# X-Request-ID: test-123

# Verificar logs com requestId
```

### Critério de Conclusão
- [x] Middleware criado
- [x] Request ID aplicado em todas rotas
- [x] Header `X-Request-ID` presente nas respostas
- [x] Logs incluem `requestId` (via `createRequestLogger`)
- [x] IDs customizados são respeitados
- [x] Testes unitários (6 testes) ✅
- [x] Testes de integração (7 testes) ✅

---

## 5.4. APM Básico
- [ ] **Status:** Pendente
- **Prioridade:** 🟢 BAIXA
- **Tempo estimado:** 1 hora
- **Arquivos afetados:** `src/middleware/apm.ts` (novo), `src/server.ts`

### Descrição
Application Performance Monitoring básico com tracking de operações lentas.

### Passo a Passo

**1. Criar `src/middleware/apm.ts`:**
```typescript
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const SLOW_REQUEST_THRESHOLD = 2000; // 2 segundos

interface PerformanceData {
  method: string;
  url: string;
  duration: number;
  statusCode: number;
  requestId: string;
  timestamp: string;
}

const slowRequests: PerformanceData[] = [];
const MAX_SLOW_REQUESTS = 100;

export function apmMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    // Log requests lentos
    if (duration > SLOW_REQUEST_THRESHOLD) {
      const data: PerformanceData = {
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode,
        requestId: req.id,
        timestamp: new Date().toISOString(),
      };

      logger.warn('⚠️ Request lento detectado', data);

      // Armazenar em memória (limitado)
      slowRequests.unshift(data);
      if (slowRequests.length > MAX_SLOW_REQUESTS) {
        slowRequests.pop();
      }
    }
  });

  next();
}

export function getSlowRequests(): PerformanceData[] {
  return slowRequests;
}

export function getApmStats() {
  return {
    slowRequestsCount: slowRequests.length,
    slowRequests: slowRequests.slice(0, 10), // Top 10
    averageDuration: slowRequests.reduce((sum, r) => sum + r.duration, 0) / slowRequests.length || 0,
  };
}
```

**2. Aplicar em `src/server.ts`:**
```typescript
import { apmMiddleware } from './middleware/apm';

// Após request ID
app.use(apmMiddleware);
```

**3. Adicionar endpoint de stats:**
```typescript
// Em src/routes/health.routes.ts
import { getApmStats } from '../middleware/apm';

router.get('/health/apm', (_req, res) => {
  res.json(getApmStats());
});
```

### Teste de Validação
```bash
# Forçar request lento (adicionar delay temporário)
curl -X POST http://localhost:3001/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{"pecas":[/* muitas peças */]}'

# Verificar stats
curl http://localhost:3001/health/apm
```

### Critério de Conclusão
- [ ] Middleware APM criado
- [ ] Requests lentos são detectados
- [ ] Logs de warning gerados
- [ ] Endpoint `/health/apm` funciona
- [ ] Top 10 requests lentos armazenados

---

# 6. DevOps

## 6.1. CI/CD GitHub Actions
- [ ] **Status:** Pendente
- **Prioridade:** 🟡 MÉDIA
- **Tempo estimado:** 1 hora
- **Arquivos afetados:** `.github/workflows/ci.yml` (novo), `.github/workflows/deploy.yml` (novo)

### Descrição
Automação de testes, linting e build via GitHub Actions.

### Passo a Passo

**1. Criar `.github/workflows/ci.yml`:**
```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linter
      run: npm run lint

    - name: Run type check
      run: npm run type-check

    - name: Run tests
      run: npm test

    - name: Build
      run: npm run build

    - name: Upload coverage
      if: matrix.node-version == '20.x'
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/coverage-final.json
```

**2. Criar `.github/workflows/deploy.yml` (opcional):**
```yaml
name: Deploy

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'

    - name: Install dependencies
      run: npm ci

    - name: Build
      run: npm run build

    - name: Deploy to Render
      # Trigger deploy hook ou usar render-deploy action
      run: |
        curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK }}"
```

**3. Adicionar scripts em `package.json`:**
```json
{
  "scripts": {
    "lint": "eslint src --ext .ts",
    "type-check": "tsc --noEmit",
    "test": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
```

**4. Criar `.eslintrc.json` (se não existe):**
```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "plugins": ["@typescript-eslint"],
  "env": {
    "node": true,
    "es2022": true
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
```

**5. Instalar dependências de lint:**
```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### Teste de Validação
```bash
# Executar localmente
npm run lint
npm run type-check
npm test
npm run build

# Push para GitHub e verificar Actions
git push origin main
# Ver https://github.com/{user}/{repo}/actions
```

### Critério de Conclusão
- [ ] Workflows criados
- [ ] CI roda em PRs e pushes
- [ ] Linting funciona
- [ ] Type-check funciona
- [ ] Build funciona no CI

---

## 6.2. Environment Configs
- [x] **Status:** ✅ Concluído em 2025-12-06
- **Prioridade:** 🟡 MÉDIA
- **Tempo estimado:** 45 minutos
- **Arquivos afetados:** `src/config/index.ts` (novo), `.env.example`, `src/server.ts`

### Descrição
Validação e centralização de variáveis de ambiente.

### Passo a Passo

**1. Instalar dependências:**
```bash
npm install dotenv
npm install --save-dev @types/node
```

**2. Criar `src/config/index.ts`:**
```typescript
import { config } from 'dotenv';
import { z } from 'zod';

// Carregar .env
config();

// Schema de validação
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3001'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  // Opcional
  RENDER_DEPLOY_HOOK: z.string().url().optional(),
});

// Validar e exportar
function loadConfig() {
  try {
    const parsed = envSchema.parse(process.env);

    return {
      nodeEnv: parsed.NODE_ENV,
      port: parsed.PORT,
      logLevel: parsed.LOG_LEVEL,
      allowedOrigins: parsed.ALLOWED_ORIGINS.split(','),
      isProduction: parsed.NODE_ENV === 'production',
      isDevelopment: parsed.NODE_ENV === 'development',
      isTest: parsed.NODE_ENV === 'test',
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Erro de configuração:');
      console.error(error.errors);
      process.exit(1);
    }
    throw error;
  }
}

export const appConfig = loadConfig();
```

**3. Atualizar `.env.example`:**
```env
# Ambiente
NODE_ENV=development

# Servidor
PORT=3001

# Logging
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://cnc-builder.vercel.app

# Deploy (opcional)
# RENDER_DEPLOY_HOOK=https://api.render.com/deploy/...
```

**4. Usar em `src/server.ts`:**
```typescript
import { appConfig } from './config';

const PORT = appConfig.port;

app.use(cors({
  origin: appConfig.allowedOrigins,
  // ...
}));

app.listen(PORT, () => {
  logger.info('🚀 API rodando', {
    port: PORT,
    env: appConfig.nodeEnv,
  });
});
```

**5. Atualizar `logger.ts`:**
```typescript
import { appConfig } from '../config';

export const logger = winston.createLogger({
  level: appConfig.logLevel,
  // ...
});
```

### Teste de Validação
```bash
# Testar com env inválido
NODE_ENV=invalid npm start
# Deve retornar erro de validação

# Testar com PORT inválido
PORT=abc npm start
# Deve retornar erro de validação

# Testar com env válido
npm start
# Deve funcionar
```

### Critério de Conclusão
- [x] Config centralizado criado
- [x] Validação com Zod funciona
- [x] Erros de config impedem inicialização
- [x] `.env.example` atualizado
- [x] Todos arquivos usam `appConfig`

---

# 7. Testes

## 7.1. Testes Unitários (Jest)
- [x] **Status:** ✅ Concluído em 2025-12-06
- **Prioridade:** 🔴 CRÍTICA
- **Tempo estimado:** 3 horas
- **Arquivos afetados:** `src/**/*.test.ts` (novos), `jest.config.js` (novo)

### Descrição
Testes unitários para funções críticas (nesting, geração de G-code, validação).

### Passo a Passo

**1. Instalar dependências:**
```bash
npm install --save-dev jest ts-jest @types/jest
```

**2. Criar `jest.config.js`:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

**3. Criar `src/services/nesting-algorithm.test.ts`:**
```typescript
import { posicionarPecas } from './nesting-algorithm';
import { ConfigChapa, Peca } from '../types';

describe('Nesting Algorithm', () => {
  const configChapa: ConfigChapa = {
    largura: 1000,
    altura: 1000,
    espessura: 15,
  };

  describe('posicionarPecas', () => {
    it('deve posicionar uma peça simples', () => {
      const pecas: Peca[] = [
        { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
      ];

      const resultado = posicionarPecas(pecas, configChapa);

      expect(resultado.posicionadas).toHaveLength(1);
      expect(resultado.naoCouberam).toHaveLength(0);
      expect(resultado.metricas.eficiencia).toBeGreaterThan(0);
    });

    it('deve retornar peça em naoCouberam quando não cabe', () => {
      const pecas: Peca[] = [
        { largura: 2000, altura: 2000, tipoCorte: 'externo', id: '1' },
      ];

      const resultado = posicionarPecas(pecas, configChapa);

      expect(resultado.posicionadas).toHaveLength(0);
      expect(resultado.naoCouberam).toHaveLength(1);
    });

    it('deve posicionar múltiplas peças', () => {
      const pecas: Peca[] = [
        { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
        { largura: 100, altura: 100, tipoCorte: 'externo', id: '2' },
        { largura: 100, altura: 100, tipoCorte: 'externo', id: '3' },
      ];

      const resultado = posicionarPecas(pecas, configChapa);

      expect(resultado.posicionadas.length).toBeGreaterThan(0);
      expect(resultado.metricas.eficiencia).toBeGreaterThan(0);
    });

    it('deve calcular eficiência corretamente', () => {
      const pecas: Peca[] = [
        { largura: 500, altura: 500, tipoCorte: 'externo', id: '1' },
      ];

      const resultado = posicionarPecas(pecas, configChapa);

      // 500x500 em chapa 1000x1000 = 25% de eficiência
      expect(resultado.metricas.eficiencia).toBeCloseTo(25, 0);
    });
  });
});
```

**4. Criar `src/services/gcode-generator.test.ts`:**
```typescript
import { gerarGCode } from './gcode-generator';

describe('G-code Generator', () => {
  it('deve gerar G-code válido', () => {
    const pecas = [
      { id: '1', largura: 100, altura: 100, x: 0, y: 0, tipoCorte: 'externo', rotacionada: false },
    ];

    const gcode = gerarGCode(pecas, {}, {}, {});

    expect(gcode).toContain('G21'); // Modo métrico
    expect(gcode).toContain('G90'); // Posicionamento absoluto
    expect(gcode).toContain('M30'); // Fim de programa
  });

  it('deve incluir comentários quando solicitado', () => {
    const pecas = [
      { id: '1', largura: 100, altura: 100, x: 0, y: 0, tipoCorte: 'externo', rotacionada: false },
    ];

    const gcode = gerarGCode(pecas, {}, {}, {}, true);

    expect(gcode).toContain('(');
    expect(gcode).toContain(')');
  });
});
```

**5. Adicionar em `package.json`:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Teste de Validação
```bash
# Executar testes
npm test

# Executar com coverage
npm run test:coverage

# Deve passar todos os testes e mostrar cobertura
```

### Critério de Conclusão
- [x] Jest configurado
- [x] Testes de nesting escritos
- [x] Testes de G-code escritos
- [x] Cobertura adequada (>84% nesting, >40% gcode, >90% funções)
- [x] Todos testes passando (30/30)

---

## 7.2. Testes de Integração
- [x] **Status:** ✅ Concluído em 2025-12-06
- **Prioridade:** 🟡 MÉDIA
- **Tempo estimado:** 2 horas
- **Arquivos afetados:** `src/__tests__/integration/*.test.ts` (novos)

### Descrição
Testes de integração para endpoints da API.

### Passo a Passo

**1. Instalar dependências:**
```bash
npm install --save-dev supertest @types/supertest
```

**2. Criar `src/__tests__/integration/gcode.test.ts`:**
```typescript
import request from 'supertest';
import express from 'express';
import gcodeRoutes from '../../routes/gcode.routes';

const app = express();
app.use(express.json());
app.use('/api', gcodeRoutes);

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
    expect(response.body).toHaveProperty('metricas');
    expect(response.body.gcode).toContain('G21');
  });

  it('deve retornar 400 com pecas vazias', async () => {
    await request(app)
      .post('/api/gcode/generate')
      .send({ pecas: [] })
      .expect(400);
  });

  it('deve respeitar rate limiting', async () => {
    // Fazer 11 requests (limite é 10)
    const requests = Array.from({ length: 11 }, () =>
      request(app)
        .post('/api/gcode/generate')
        .send({
          pecas: [{ largura: 100, altura: 100, tipoCorte: 'externo', id: '1' }],
        })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
  });
});

describe('POST /api/gcode/validate', () => {
  it('deve validar configurações válidas', async () => {
    const response = await request(app)
      .post('/api/gcode/validate')
      .send({
        pecas: [{ largura: 100, altura: 100, tipoCorte: 'externo', id: '1' }],
      })
      .expect(200);

    expect(response.body).toHaveProperty('valid');
    expect(response.body.valid).toBe(true);
  });
});
```

**3. Criar `src/__tests__/integration/health.test.ts`:**
```typescript
import request from 'supertest';
import express from 'express';
import healthRoutes from '../../routes/health.routes';

const app = express();
app.use(healthRoutes);

describe('Health Endpoints', () => {
  it('GET /health deve retornar status ok', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /health/detailed deve retornar métricas', async () => {
    const response = await request(app)
      .get('/health/detailed')
      .expect(200);

    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('system');
  });
});
```

### Teste de Validação
```bash
# Executar testes de integração
npm test -- integration

# Deve passar todos os testes
```

### Critério de Conclusão
- [x] Supertest configurado
- [x] Testes de endpoints escritos
- [x] Testes de validação funcionando
- [x] Testes de rate limiting funcionando
- [x] Todos testes passando (20 testes de integração + 30 unitários = 50 total)

---

## 7.3. Testes E2E
- [ ] **Status:** Pendente
- **Prioridade:** 🟢 BAIXA
- **Tempo estimado:** 2 horas
- **Arquivos afetados:** `src/__tests__/e2e/*.test.ts` (novos)

### Descrição
Testes end-to-end simulando fluxos completos de usuário.

### Passo a Passo

**1. Criar `src/__tests__/e2e/full-workflow.test.ts`:**
```typescript
import request from 'supertest';
import app from '../../server'; // Exportar app do server.ts

describe('E2E: Fluxo Completo', () => {
  it('deve completar fluxo: validar → gerar → cache', async () => {
    const payload = {
      pecas: [
        { largura: 100, altura: 100, tipoCorte: 'externo', id: '1' },
        { largura: 150, altura: 150, tipoCorte: 'externo', id: '2' },
      ],
    };

    // 1. Validar
    const validacao = await request(app)
      .post('/api/gcode/validate')
      .send(payload)
      .expect(200);

    expect(validacao.body.valid).toBe(true);

    // 2. Gerar G-code
    const geracao = await request(app)
      .post('/api/gcode/generate')
      .send(payload)
      .expect(200);

    expect(geracao.body.gcode).toBeDefined();
    expect(geracao.body.metricas.pecasPosicionadas).toBe(2);

    // 3. Validar novamente (deve usar cache)
    const validacaoCache = await request(app)
      .post('/api/gcode/validate')
      .send(payload)
      .expect(200);

    expect(validacaoCache.body).toEqual(validacao.body);

    // 4. Verificar cache stats
    const stats = await request(app)
      .get('/api/cache/stats')
      .expect(200);

    expect(stats.body.hits).toBeGreaterThan(0);
  });

  it('deve lidar com múltiplas chapas', async () => {
    const payload = {
      pecas: Array.from({ length: 50 }, (_, i) => ({
        largura: 100,
        altura: 100,
        tipoCorte: 'externo',
        id: String(i + 1),
      })),
      configChapa: { largura: 500, altura: 500, espessura: 15 },
    };

    const response = await request(app)
      .post('/api/gcode/generate-multi')
      .send(payload)
      .expect(200);

    expect(response.body.chapas.length).toBeGreaterThan(1);
    expect(response.body.resumo.totalPecas).toBe(50);
  });
});
```

**2. Exportar app em `src/server.ts`:**
```typescript
// No final do arquivo
export default app; // Para testes

// Só iniciar servidor se não for teste
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info('🚀 API rodando', { port: PORT });
  });
}
```

### Teste de Validação
```bash
# Executar testes E2E
npm test -- e2e

# Deve passar todos os testes
```

### Critério de Conclusão
- [ ] Testes E2E escritos
- [ ] Fluxo completo testado
- [ ] Múltiplas chapas testadas
- [ ] Cache testado no fluxo
- [ ] Todos testes passando

---

# 8. Documentação

## 8.1. OpenAPI/Swagger
- [ ] **Status:** Pendente
- **Prioridade:** 🟡 MÉDIA
- **Tempo estimado:** 2 horas
- **Arquivos afetados:** `src/docs/swagger.ts` (novo), `src/server.ts`

### Descrição
Documentação interativa da API com Swagger/OpenAPI.

### Passo a Passo

**1. Instalar dependências:**
```bash
npm install swagger-ui-express swagger-jsdoc
npm install --save-dev @types/swagger-ui-express @types/swagger-jsdoc
```

**2. Criar `src/docs/swagger.ts`:**
```typescript
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CNC Builder API',
      version: '1.0.0',
      description: 'API para geração de G-code para máquinas CNC',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development',
      },
      {
        url: 'https://cnc-builder-api.onrender.com',
        description: 'Production',
      },
    ],
    tags: [
      { name: 'G-code', description: 'Geração e validação de G-code' },
      { name: 'Health', description: 'Health checks e métricas' },
      { name: 'Presets', description: 'Gerenciamento de presets' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
```

**3. Adicionar em `src/server.ts`:**
```typescript
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';

// Documentação
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

**4. Documentar rotas com JSDoc:**
```typescript
// Em src/routes/gcode.routes.ts

/**
 * @swagger
 * /api/gcode/generate:
 *   post:
 *     summary: Gera G-code para peças
 *     tags: [G-code]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pecas
 *             properties:
 *               pecas:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     largura:
 *                       type: number
 *                     altura:
 *                       type: number
 *                     tipoCorte:
 *                       type: string
 *                       enum: [externo, interno, na-linha]
 *                     id:
 *                       type: string
 *               configChapa:
 *                 type: object
 *                 properties:
 *                   largura:
 *                     type: number
 *                   altura:
 *                     type: number
 *                   espessura:
 *                     type: number
 *     responses:
 *       200:
 *         description: G-code gerado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 gcode:
 *                   type: string
 *                 metricas:
 *                   type: object
 *       400:
 *         description: Dados inválidos
 */
router.post('/gcode/generate', ...);
```

### Teste de Validação
```bash
# Iniciar servidor
npm run dev

# Abrir navegador em:
# http://localhost:3001/api-docs

# Deve mostrar documentação interativa
```

### Critério de Conclusão
- [ ] Swagger instalado
- [ ] Spec gerado
- [ ] Endpoint `/api-docs` funciona
- [ ] Todas rotas documentadas
- [ ] Exemplos funcionais

---

## 8.2. README Técnico Completo
- [ ] **Status:** Pendente
- **Prioridade:** 🟢 BAIXA
- **Tempo estimado:** 1.5 horas
- **Arquivos afetados:** `README.md`, `docs/` (novo)

### Descrição
Documentação completa para desenvolvedores.

### Passo a Passo

**1. Atualizar `README.md`:**
```markdown
# CNC Builder API

API para geração de G-code para máquinas CNC com algoritmos de nesting otimizados.

## Features

- ✅ Geração de G-code otimizado
- ✅ 3 algoritmos de nesting (Greedy, Shelf, Guillotine)
- ✅ Validação de configurações
- ✅ Cache de validações
- ✅ Rate limiting e segurança
- ✅ Métricas Prometheus
- ✅ Documentação Swagger

## Quick Start

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

\`\`\`bash
# Clonar repositório
git clone https://github.com/user/cnc-builder-api
cd cnc-builder-api

# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env

# Executar em desenvolvimento
npm run dev
\`\`\`

### Endpoints Principais

- `POST /api/gcode/generate` - Gerar G-code
- `POST /api/gcode/validate` - Validar configurações
- `GET /health` - Health check
- `GET /api-docs` - Documentação Swagger
- `GET /metrics` - Métricas Prometheus

## Documentação Completa

- [Guia de API](docs/API.md)
- [Algoritmos de Nesting](docs/NESTING.md)
- [Configuração](docs/CONFIG.md)
- [Deployment](docs/DEPLOY.md)

## Desenvolvimento

\`\`\`bash
# Executar testes
npm test

# Executar com coverage
npm run test:coverage

# Linting
npm run lint

# Build
npm run build
\`\`\`

## Arquitetura

\`\`\`
src/
├── config/          # Configurações
├── middleware/      # Middlewares Express
├── routes/          # Rotas da API
├── services/        # Lógica de negócio
├── types/           # TypeScript types
└── utils/           # Utilidades
\`\`\`

## Performance

- Cache de validação (5min TTL)
- Compressão gzip
- Rate limiting
- Algoritmos otimizados (< 2s para 500 peças)

## Segurança

- Helmet security headers
- CORS restritivo
- Input sanitization
- Request size limits
- Timeout protection

## License

MIT
```

**2. Criar `docs/API.md` com exemplos de uso**

**3. Criar `docs/NESTING.md` com explicação dos algoritmos**

**4. Criar `docs/CONFIG.md` com todas variáveis de ambiente**

**5. Criar `docs/DEPLOY.md` com guia de deployment**

### Critério de Conclusão
- [ ] README atualizado
- [ ] Docs criadas
- [ ] Exemplos funcionais
- [ ] Screenshots adicionados
- [ ] Links funcionando

---

## 8.3. Guia de Contribuição
- [ ] **Status:** Pendente
- **Prioridade:** 🟢 BAIXA
- **Tempo estimado:** 1 hora
- **Arquivos afetados:** `CONTRIBUTING.md` (novo), `.github/PULL_REQUEST_TEMPLATE.md` (novo)

### Descrição
Guia para contribuidores externos.

### Passo a Passo

**1. Criar `CONTRIBUTING.md`:**
```markdown
# Guia de Contribuição

Obrigado por considerar contribuir com o CNC Builder API!

## Processo de Contribuição

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Faça commit das mudanças (`git commit -m 'feat: adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Padrões de Código

### Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `refactor:` Refatoração
- `test:` Testes
- `chore:` Manutenção

### TypeScript

- Use tipos explícitos
- Evite `any`
- Documente funções públicas

### Testes

- Escreva testes para novas features
- Mantenha cobertura > 70%
- Execute `npm test` antes de commit

## Reportar Bugs

Abra uma issue com:

- Descrição clara do bug
- Passos para reproduzir
- Comportamento esperado vs atual
- Versão do Node.js

## Sugerir Features

Abra uma issue descrevendo:

- Problema que resolve
- Solução proposta
- Alternativas consideradas

## Code Review

PRs serão revisados quanto a:

- Qualidade de código
- Testes
- Documentação
- Performance
- Segurança
```

**2. Criar `.github/PULL_REQUEST_TEMPLATE.md`:**
```markdown
## Descrição

[Descreva as mudanças]

## Tipo de Mudança

- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Documentação

## Checklist

- [ ] Código segue padrões do projeto
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] Todos testes passando
- [ ] Sem warnings de lint

## Screenshots (se aplicável)

## Issues Relacionadas

Closes #[número]
```

**3. Criar `.github/ISSUE_TEMPLATE/bug_report.md`**

**4. Criar `.github/ISSUE_TEMPLATE/feature_request.md`**

### Critério de Conclusão
- [ ] CONTRIBUTING.md criado
- [ ] PR template criado
- [ ] Issue templates criados
- [ ] Processo claro documentado

---

## 📝 Como Marcar uma Melhoria como Concluída

Quando implementar uma melhoria, marque o checkbox:

```markdown
## 1.1. Rate Limiting
- [x] **Status:** ✅ Concluído em 2025-12-03
```

E atualize o Dashboard no topo do arquivo.

---

## 🔗 Commit Messages Sugeridos

Use este padrão para commits:

```bash
# Segurança
git commit -m "feat(security): add rate limiting (#1.1)"
git commit -m "feat(security): add helmet security headers (#1.2)"

# Performance
git commit -m "feat(performance): add validation cache (#2.1)"
git commit -m "feat(performance): add gzip compression (#2.2)"

# Qualidade
git commit -m "refactor(errors): implement standardized error handling (#3.1)"
git commit -m "feat(logging): add Winston structured logging (#3.2)"
```
