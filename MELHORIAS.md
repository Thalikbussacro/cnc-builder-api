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
- **Total:** 28 melhorias
- **Concluídas:** 12/28 (42.86%)
- **Em progresso:** 0/28 (0%)
- **Pendentes:** 16/28 (57.14%)

### Por Categoria
- [x] **Segurança:** 6/6 (100%) ✅
- [x] **Performance:** 3/3 (100%) ✅
- [x] **Qualidade de Código:** 3/3 (100%) ✅
- [ ] **Funcionalidades:** 0/3
- [ ] **Observabilidade:** 0/4
- [ ] **DevOps:** 0/3
- [ ] **Testes:** 0/3
- [ ] **Documentação:** 0/3

---

## 🎯 Ordem Recomendada de Implementação

### Fase 1 - Segurança (Semana 1-2)
1. [#1.1](#11-rate-limiting) Rate Limiting
2. [#1.2](#12-security-headers-helmet) Security Headers
3. [#1.3](#13-cors-restritivo) CORS Restritivo
4. [#1.4](#14-input-sanitization) Input Sanitization
5. [#7.1](#71-testes-unitários-jest) Testes Unitários Básicos

### Fase 2 - Performance (Semana 3-4)
1. [#2.1](#21-cache-de-validação) Cache de Validação
2. [#2.2](#22-compressão-de-respostas) Compressão
3. [#3.1](#31-error-handling-padronizado) Error Handling

### Fase 3 - DevOps (Semana 5-6)
1. [#6.1](#61-docker-support) Docker
2. [#6.2](#62-cicd-github-actions) CI/CD
3. [#3.2](#32-logging-estruturado) Logging

### Fase 4 - Infraestrutura (Semana 7-8)
1. [#5.1](#51-health-check-completo) Health Check
2. [#5.2](#52-métricas-prometheus) Métricas
3. [#7.2](#72-testes-de-integração) Testes E2E

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

# (Continua com seções 4-8 no mesmo formato...)

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
