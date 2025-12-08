# GUIA DE ESTRUTURA DO CÓDIGO - CNC Builder API

> **Objetivo:** Este guia explica a organização do código, propósito de cada pasta, arquivo, e onde acontecem validações, testes, geração de G-code e outras operações importantes.

---

## 📁 ESTRUTURA DE PASTAS

```
cnc-builder-api/
├── src/                          # Todo o código-fonte TypeScript
│   ├── __tests__/                # Todos os testes (75 testes no total)
│   ├── config/                   # Configurações globais (env, swagger)
│   ├── middleware/               # Middlewares Express (segurança, validação)
│   ├── routes/                   # Definição de endpoints da API
│   ├── schemas/                  # Schemas de validação Zod
│   ├── services/                 # Lógica de negócio (algoritmos, geração)
│   ├── types/                    # Tipos TypeScript
│   ├── utils/                    # Funções auxiliares
│   └── server.ts                 # Arquivo principal que inicia o servidor
│
├── dist/                         # Código JavaScript compilado (gerado automaticamente)
├── coverage/                     # Relatórios de cobertura de testes
└── [arquivos de config]          # package.json, tsconfig.json, etc
```

---

## 🎯 PROPÓSITO DE CADA PASTA

### `src/` - Código Fonte Principal

Todo o código TypeScript fica aqui. É onde você vai trabalhar quando precisar modificar algo.

### `src/__tests__/` - Testes Automatizados

**Propósito:** Garantir que o código funciona corretamente.

```
__tests__/
├── unit/                         # Testes de funções isoladas
│   └── request-id.test.ts        # Testa geração de UUID
│
├── integration/                  # Testes de endpoints da API
│   ├── gcode.test.ts             # Testa geração e validação de G-code
│   ├── health.test.ts            # Testa health checks
│   └── request-id.test.ts        # Testa propagação de IDs
│
├── e2e/                          # Testes de fluxos completos
│   └── workflows.test.ts         # Testa validação → geração → cache
│
└── __mocks__/                    # Simulações para testes
    └── uuid.ts                   # Mock do gerador de UUID
```

**Como rodar:**
```bash
npm test                  # Roda todos os 75 testes
npm run test:watch       # Roda e fica observando mudanças
npm run test:coverage    # Gera relatório de cobertura
```

**O que é testado:**
- ✅ Geração de G-code com peças válidas
- ✅ Rejeição de dados inválidos
- ✅ Algoritmos de nesting (Greedy, Shelf, Guillotine)
- ✅ Health checks da API
- ✅ Sistema de cache
- ✅ Validação de configurações

---

### `src/config/` - Configurações Globais

**Propósito:** Carregar e validar variáveis de ambiente.

#### `index.ts` - Variáveis de Ambiente

```typescript
NODE_ENV       // 'development' | 'production' | 'test'
PORT           // Porta do servidor (padrão: 3001)
LOG_LEVEL      // Nível de log: 'error' | 'warn' | 'info' | 'debug'
ALLOWED_ORIGINS // Origens permitidas para CORS (separadas por vírgula)
```

**Exemplo de `.env`:**
```env
NODE_ENV=development
PORT=3001
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:3000,https://cnc-builder.vercel.app
```

#### `swagger.ts` - Documentação da API

Define a documentação OpenAPI 3.0 que aparece em `http://localhost:3001/api-docs`.

**O que documenta:**
- Todos os endpoints disponíveis
- Estrutura de request/response
- Exemplos de uso
- Códigos de erro possíveis

---

### `src/middleware/` - Filtros e Processadores

**Propósito:** Código que roda ANTES de chegar nos endpoints, filtrando e processando requisições.

#### `error-handler.ts` - Tratamento de Erros

**Classes de erro:**
```typescript
AppError           // Erro genérico da aplicação
BadRequestError    // HTTP 400 - Requisição inválida
ValidationError    // HTTP 422 - Dados não passam validação
NotFoundError      // HTTP 404 - Recurso não encontrado
```

**Como funciona:**
- Captura TODOS os erros da API
- Em produção: retorna mensagem genérica (não expõe código interno)
- Em desenvolvimento: retorna stacktrace completo

#### `rate-limit.ts` - Controle de Requisições

**Limites configurados:**
```typescript
apiLimiter              // 100 requisições a cada 15 minutos (global)
gcodeGenerationLimiter  // 20 requisições por minuto (POST /api/gcode/generate)
validationLimiter       // 30 requisições por minuto (POST /api/gcode/validate)
```

**Por que existe:** Previne abuso da API (usuários fazendo milhares de requisições).

#### `request-id.ts` - Rastreamento de Requisições

**O que faz:**
- Gera um UUID único para cada requisição (ex: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
- Propaga esse ID no header `X-Request-ID`
- Permite rastrear uma requisição específica nos logs

**Útil para:** Debugging - você consegue filtrar logs de uma única requisição.

#### `sanitize.ts` - Sanitização de Entrada

**O que faz:** Remove caracteres maliciosos do input do usuário antes de processar.

**Exemplo:**
```javascript
Input:  { nome: "<script>alert('hack')</script>" }
Output: { nome: "alert('hack')" }  // Tags HTML removidas
```

**Por que existe:** Previne ataques de injeção de código.

---

### `src/routes/` - Endpoints da API

**Propósito:** Define quais URLs existem e o que cada uma faz.

#### `gcode.routes.ts` - Rotas Principais

```
POST /api/gcode/generate
├─ Entrada: { pecas, configChapa, configCorte, configFerramenta, metodoNesting }
└─ Saída:   { gcode: string, metadata: { linhas, tamanho, tempo, métricas } }

POST /api/gcode/validate
├─ Entrada: (mesmo que generate)
└─ Saída:   { valid, errors[], warnings[], preview }

GET /api/cache/stats
└─ Saída:   { keys, hits, misses, hitRate }
```

#### `health.routes.ts` - Rotas de Monitoramento

```
GET /health                # Health check básico
GET /health/detailed       # Health check com métricas (CPU, memória)
GET /ready                 # Pronto para receber tráfego? (Kubernetes)
GET /live                  # Aplicação está viva? (Kubernetes)
```

---

### `src/schemas/` - Validação de Entrada

**Propósito:** Define a estrutura EXATA que as requisições devem ter.

#### `gcode.schema.ts` - Schemas Zod

```typescript
// Valida uma peça
PecaSchema = {
  id: string,
  largura: number (min: 1, max: 10000),
  altura: number (min: 1, max: 10000),
  tipoCorte: 'externo' | 'interno' | 'na-linha'
}

// Valida configurações da chapa
ConfigChapaSchema = {
  largura: number (min: 100, max: 10000),
  altura: number (min: 100, max: 10000),
  espessura: number (min: 1, max: 200)
}

// Valida configurações de corte
ConfigCorteSchema = {
  profundidade: number (min: 0.1, max: 1000),
  espacamento: number (min: 0, max: 1000),
  feedrate: number (min: 1, max: 50000),
  plungeRate: number (min: 1, max: 10000),
  spindleSpeed: number (min: 1000, max: 30000),
  // ... e mais
}

// Valida requisição completa
GenerateRequestSchema = {
  pecas: PecaSchema[],
  configChapa?: ConfigChapaSchema,     // Opcional
  configCorte?: ConfigCorteSchema,     // Opcional
  configFerramenta?: ConfigFerramentaSchema,
  metodoNesting?: 'greedy' | 'shelf' | 'guillotine',
  incluirComentarios?: boolean
}
```

**Como funciona:**
1. Requisição chega → Zod valida
2. Se inválido → Retorna HTTP 400 com erro detalhado
3. Se válido → Continua processamento

---

### `src/services/` - Lógica de Negócio

**Propósito:** Aqui está o "cérebro" da aplicação - algoritmos, validações, geração de G-code.

#### `gcode-generator-v2.ts` - Gerador de G-Code (858 linhas)

**Responsabilidade:** Gerar código G-code otimizado pronto para máquina CNC.

**Otimizações implementadas:**
- ✅ Remove movimentos Z redundantes (economiza ~30% de comandos)
- ✅ Mantém compensação ativa durante todas as passadas
- ✅ Suporta rampa de entrada (menos quebra de fresa)
- ✅ Formata números sem zeros desnecessários (G1 X10 em vez de G1 X10.000)
- ✅ Calcula tempo estimado de execução

**Estrutura do G-code gerado:**
```gcode
; === G-CODE V2 OTIMIZADO ===
; Gerado em: 07/12/2025 10:30:45
; Chapa 2850x1500mm, Prof 15mm
; TEMPO ESTIMADO: 2h 30min 45s

G21              ; Modo métrico
G90              ; Posicionamento absoluto
M3 S18000        ; Liga spindle a 18000 RPM
G0 Z5            ; Altura de segurança

; Peca 1 (500x500mm) - Passada 1/4
G0 X100 Y100     ; Posiciona
G1 Z-3.75 F500   ; Mergulho (primeira passada)
G42              ; Compensação externa
G1 X600 Y100 F1500  ; Corte
G1 X600 Y600     ; Corte
G1 X100 Y600     ; Corte
G1 X100 Y100     ; Corte (fecha contorno)

; Peca 1 - Passada 2/4
G1 Z-7.5         ; Desce mais (sem sair da peça!)
G1 X600 Y100     ; Corte
...

G40              ; Cancela compensação
M30              ; Fim do programa
```

**Parâmetros importantes:**
- **Compensação:** G41 (interno), G42 (externo), G40 (sem compensação)
- **Rampa:** Entrada gradual em ângulo (2-5 graus recomendado)
- **Passadas:** Divide profundidade total em múltiplas passadas rasas

#### `nesting-algorithm.ts` - Algoritmos de Posicionamento

**Responsabilidade:** Decidir ONDE colocar cada peça na chapa para minimizar desperdício.

**3 Algoritmos Disponíveis:**

##### 1️⃣ GREEDY (Guloso) - Primeiro que Cabe
```
Estratégia: Coloca peça no primeiro espaço disponível
Vantagem: Rápido e simples
Desvantagem: Pode desperdiçar espaço

Como funciona:
1. Ordena peças por área (maior primeiro)
2. Tenta colocar em (0,0)
3. Se não cabe, tenta próximo candidato
4. Gera novos candidatos após cada colocação
```

##### 2️⃣ SHELF (Prateleira) - Linhas Horizontais
```
Estratégia: Agrupa peças em "prateleiras" horizontais
Vantagem: Aproveitamento vertical melhor
Desvantagem: Pode deixar espaços horizontais

Como funciona:
1. Ordena peças por altura (maior primeiro)
2. Cria primeira prateleira com altura da maior peça
3. Preenche prateleira até não caber
4. Cria nova prateleira abaixo
```

##### 3️⃣ GUILLOTINE (Guilhotina) - Divisão Recursiva ⭐ RECOMENDADO
```
Estratégia: Divide espaço livre em retângulos recursivamente
Vantagem: Melhor para peças variadas (80-90% aproveitamento)
Desvantagem: Mais complexo

Como funciona:
1. Ordena peças por área (maior primeiro)
2. Mantém lista de retângulos livres
3. Para cada peça, escolhe melhor retângulo
4. Remove retângulo usado e divide em novos
```

**Função auxiliar:**
```typescript
otimizarOrdemCorte() // Algoritmo TSP Nearest-Neighbor
// Minimiza deslocamentos da fresa entre peças
// Começa na peça mais próxima de (0,0)
// Sempre vai para peça não visitada mais próxima
```

#### `validator.ts` - Validação de Configurações CNC

**Responsabilidade:** Verificar se os parâmetros de corte são seguros.

**Validações críticas (ERRORS):**
- ❌ Profundidade ≤ 0 → "Profundidade deve ser maior que zero"
- ❌ Profundidade por passada > profundidade total → "Passada muito profunda"
- ❌ Feedrate fora do range (50-5000) → "Feedrate muito rápido/lento"
- ❌ Ângulo de rampa fora de 1-10 graus → "Rampa perigosa"

**Validações de aviso (WARNINGS):**
- ⚠️ Profundidade > 30mm → "Profundidade acima do recomendado"
- ⚠️ Feedrate > 3000 → "Feedrate muito alto, pode vibrar"
- ⚠️ Muitas peças (>100) → "Alto uso de memória"

**Retorno:**
```typescript
{
  valid: boolean,
  errors: [
    {
      severity: 'error',
      field: 'profundidade',
      message: 'Profundidade muito rasa',
      suggestion: 'Use pelo menos 1mm',
      currentValue: 0.5,
      recommendedValue: 1
    }
  ],
  warnings: [ ... ]
}
```

#### `validation-rules.ts` - Regras e Mensagens

**Responsabilidade:** Centralizar todas as regras de validação.

**Exemplo:**
```typescript
VALIDATION_RULES = {
  profundidade: {
    min: 1,
    max: 50,
    recomendadoMin: 1,
    recomendadoMax: 30,
    mensagemMin: 'Profundidade muito rasa',
    mensagemMax: 'Profundidade muito profunda'
  },
  feedrate: {
    min: 50,
    max: 5000,
    recomendadoMin: 500,
    recomendadoMax: 3000,
    mensagemMin: 'Feedrate muito lento',
    mensagemMax: 'Feedrate muito rápido'
  }
  // ... mais 10 campos
}
```

#### `cache.ts` - Sistema de Cache

**Responsabilidade:** Guardar resultados de validações por 5 minutos para não recalcular.

**Configuração:**
```typescript
TTL: 5 minutos
Máximo de chaves: 1000
Taxa de hit: ~75% (3 de cada 4 requisições usa cache)
```

**Como funciona:**
1. Requisição chega com peças + configs
2. Gera hash do input (chave única)
3. Verifica se hash existe no cache
   - ✅ Existe → Retorna resultado salvo (hit)
   - ❌ Não existe → Processa e salva no cache (miss)

---

### `src/types/` - Tipos TypeScript

**Propósito:** Definir a "forma" dos dados que circulam na aplicação.

#### `index.ts` - Tipos Principais

```typescript
// Peça a ser cortada
interface Peca {
  id: string
  largura: number
  altura: number
  tipoCorte: 'externo' | 'interno' | 'na-linha'
}

// Peça com posição na chapa
interface PecaPosicionada extends Peca {
  x: number  // Coordenada X
  y: number  // Coordenada Y
}

// Configurações da chapa
interface ConfiguracoesChapa {
  largura: number    // mm
  altura: number     // mm
  espessura: number  // mm
}

// Configurações de corte
interface ConfiguracoesCorte {
  profundidade: number
  espacamento: number
  profundidadePorPassada: number
  feedrate: number           // mm/min
  plungeRate: number         // mm/min (velocidade de mergulho)
  rapidsSpeed: number        // mm/min (velocidade de rapids)
  spindleSpeed: number       // RPM
  usarRampa: boolean
  anguloRampa: number        // graus
  // ... mais
}

// Configurações da fresa
interface ConfiguracoesFerramenta {
  diametro: number
  numeroFerramenta: number
}

// Resultado do nesting
interface ResultadoNesting {
  posicionadas: PecaPosicionada[]
  naoCouberam: Peca[]
}

// Tempo estimado
interface TempoEstimado {
  tempoCorte: number         // segundos
  tempoMergulho: number      // segundos
  tempoPosicionamento: number // segundos
  tempoTotal: number         // segundos
  distanciaCorte: number     // mm
  distanciaMergulho: number  // mm
  distanciaPosicionamento: number // mm
  distanciaTotal: number     // mm
}
```

---

### `src/utils/` - Funções Auxiliares

#### `defaults.ts` - Valores Padrão

**Responsabilidade:** Definir valores padrão quando usuário não especifica.

```typescript
DEFAULT_CHAPA = {
  largura: 2850,    // mm
  altura: 1500,     // mm
  espessura: 15     // mm
}

DEFAULT_CORTE = {
  profundidade: 15,              // mm
  espacamento: 50,               // mm
  profundidadePorPassada: 4,     // mm
  feedrate: 1500,                // mm/min
  plungeRate: 500,               // mm/min
  rapidsSpeed: 4000,             // mm/min
  spindleSpeed: 18000,           // RPM
  usarRampa: false,
  anguloRampa: 3                 // graus
}

DEFAULT_FERRAMENTA = {
  diametro: 6,         // mm
  numeroFerramenta: 1
}
```

#### `logger.ts` - Sistema de Logs

**Responsabilidade:** Registrar eventos da aplicação (erros, avisos, info).

**Configuração:**
```typescript
Produção: Logs para arquivo + console
Desenvolvimento: Logs apenas no console
Serverless (Vercel): Logs apenas no console
```

**Níveis de log:**
```typescript
logger.error('Erro crítico!')    // Vermelho
logger.warn('Aviso')             // Amarelo
logger.info('Informação')        // Azul
logger.debug('Debug detalhado')  // Cinza
```

---

## 🔄 FLUXO DE UMA REQUISIÇÃO

Vamos seguir o caminho de uma requisição para gerar G-code:

```
1. Cliente envia POST /api/gcode/generate
   ↓
2. [requestIdMiddleware] Gera UUID único (ex: a1b2c3d4-...)
   ↓
3. [CORS + Helmet] Valida origem e adiciona headers de segurança
   ↓
4. [compression] Prepara compressão da resposta
   ↓
5. [apiLimiter] Valida limite global (100 req/15min)
   ↓ (se exceder → HTTP 429)
   ↓
6. [sanitizeMiddleware] Remove caracteres maliciosos do input
   ↓
7. [Router] Encaminha para gcode.routes.ts
   ↓
8. [gcodeGenerationLimiter] Valida limite específico (20 req/min)
   ↓
9. [Timeout 30s] Configura timeout máximo
   ↓
10. [Zod Schema] Valida estrutura do JSON
    ↓ (se inválido → HTTP 400)
    ↓
11. [mergeWithDefaults] Completa valores faltantes com defaults
    ↓
12. [Nesting Algorithm] Executa algoritmo escolhido (greedy/shelf/guillotine)
    ↓
13. [Validator] Valida configurações CNC
    ↓ (se erro crítico → HTTP 422)
    ↓
14. [G-code Generator V2] Gera código otimizado
    ↓
15. [Time Calculator] Calcula tempo estimado
    ↓
16. [Metadata Builder] Monta resposta completa
    ↓
17. [Response] Retorna JSON com G-code + metadata
    ↓ (headers incluem X-Request-ID)
    ↓
18. Cliente recebe resposta
```

**Se houver erro em qualquer etapa:**
```
Erro
 ↓
[errorHandler] Captura erro
 ↓
Formata mensagem apropriada
 ↓
Retorna HTTP status code correto (400/422/500)
```

---

## 🧪 ONDE ACONTECEM AS VALIDAÇÕES

### 1️⃣ Validação de Estrutura (Zod)
**Arquivo:** `src/schemas/gcode.schema.ts`
**Quando:** Logo após sanitização
**O que valida:** Tipos, campos obrigatórios, limites básicos
**Erro se falhar:** HTTP 400 Bad Request

### 2️⃣ Validação de Segurança (Rate Limiting)
**Arquivo:** `src/middleware/rate-limit.ts`
**Quando:** Antes de processar qualquer lógica
**O que valida:** Número de requisições por tempo
**Erro se falhar:** HTTP 429 Too Many Requests

### 3️⃣ Validação de Entrada (Sanitização)
**Arquivo:** `src/middleware/sanitize.ts`
**Quando:** Antes do Zod
**O que valida:** Caracteres maliciosos
**Erro se falhar:** Nunca falha, apenas limpa

### 4️⃣ Validação de Configurações CNC (Regras de Negócio)
**Arquivo:** `src/services/validator.ts`
**Quando:** Após nesting, antes de gerar G-code
**O que valida:** Parâmetros de corte seguros
**Erro se falhar:** HTTP 422 Unprocessable Entity

### 5️⃣ Validação de Nesting (Espaço Disponível)
**Arquivo:** `src/services/nesting-algorithm.ts`
**Quando:** Durante posicionamento de peças
**O que valida:** Peças cabem na chapa sem colidir
**Erro se falhar:** Retorna array `naoCouberam`

---

## 🎨 ONDE ACONTECE A GERAÇÃO DE G-CODE

**Arquivo principal:** `src/services/gcode-generator-v2.ts` (858 linhas)

**Passo a passo:**

1. **Recebe entrada:**
   - Peças posicionadas (com X, Y)
   - Configurações (chapa, corte, ferramenta)

2. **Gera cabeçalho:**
   ```gcode
   ; === G-CODE V2 OTIMIZADO ===
   ; Gerado em: 07/12/2025 10:30:45
   ; Chapa 2850x1500mm, Prof 15mm
   ; TEMPO ESTIMADO: 2h 30min 45s
   ```

3. **Comandos iniciais:**
   ```gcode
   G21              ; Modo métrico
   G90              ; Absoluto
   M3 S18000        ; Liga spindle
   G0 Z5            ; Altura segurança
   ```

4. **Para cada peça:**
   - Move para posição (G0 X... Y...)
   - Aplica rampa OU mergulho vertical
   - Ativa compensação (G41/G42)
   - Corta contorno (G1 X... Y...)
   - Repete para cada passada
   - Cancela compensação (G40)

5. **Comandos finais:**
   ```gcode
   G0 Z5            ; Levanta fresa
   M5               ; Desliga spindle
   G0 X0 Y0         ; Volta para home
   M30              ; Fim programa
   ```

6. **Retorna:**
   - String com G-code completo
   - Metadata (linhas, tamanho, tempo)

---

## 📊 STACK TECNOLÓGICO E DEPENDÊNCIAS

### Runtime
- **Node.js 18+** - Ambiente de execução JavaScript
- **TypeScript 5.9.3** - JavaScript com tipos

### Framework HTTP
- **Express 5.1.0** - Framework web para APIs
- **Compression 1.8.1** - Compressão gzip de respostas
- **CORS 2.8.5** - Controle de origens permitidas

### Validação e Segurança
- **Zod 4.1.13** - Validação de schemas type-safe
- **Validator 13.15.23** - Sanitização de strings
- **Helmet 8.1.0** - Headers de segurança HTTP
- **express-rate-limit 8.2.1** - Controle de taxa de requisições

### Documentação
- **swagger-jsdoc 6.2.8** - Geração de OpenAPI spec
- **swagger-ui-express 5.0.1** - Interface interativa de docs

### Utilitários
- **UUID 8.3.2** - Geração de IDs únicos
- **Winston 3.18.3** - Sistema de logging
- **node-cache 5.1.2** - Cache em memória

### Testing
- **Jest 30.2.0** - Framework de testes
- **Supertest 7.1.4** - Testes de endpoints HTTP
- **ts-jest 29.4.6** - Suporte TypeScript no Jest

---

## 🚀 COMANDOS ÚTEIS

### Desenvolvimento
```bash
npm run dev          # Inicia servidor com hot-reload
npm run build        # Compila TypeScript → JavaScript
npm start            # Inicia servidor em produção
```

### Testes
```bash
npm test             # Roda todos os 75 testes
npm run test:watch   # Modo watch (re-roda ao salvar)
npm run test:coverage # Gera relatório de cobertura
```

### Outros
```bash
npm run lint         # Verifica problemas no código
```

---

## 📝 RESUMO EXECUTIVO

| Aspecto | Localização | Tecnologia |
|---------|-------------|------------|
| **Endpoints da API** | `src/routes/` | Express Router |
| **Validação de entrada** | `src/schemas/` | Zod |
| **Algoritmos de nesting** | `src/services/nesting-algorithm.ts` | TypeScript |
| **Geração de G-code** | `src/services/gcode-generator-v2.ts` | TypeScript |
| **Validação CNC** | `src/services/validator.ts` | Regras customizadas |
| **Testes** | `src/__tests__/` | Jest + Supertest |
| **Segurança** | `src/middleware/` | Helmet, CORS, Rate Limit |
| **Cache** | `src/services/cache.ts` | node-cache |
| **Logs** | `src/utils/logger.ts` | Winston |
| **Documentação** | `src/config/swagger.ts` | OpenAPI 3.0 |

---

## 🎯 PRINCIPAIS PONTOS DE ENTRADA

Se você quiser modificar algo específico:

| Quero modificar... | Arquivo a editar |
|-------------------|------------------|
| Adicionar novo endpoint | `src/routes/` |
| Mudar validação de entrada | `src/schemas/gcode.schema.ts` |
| Ajustar algoritmo de nesting | `src/services/nesting-algorithm.ts` |
| Modificar G-code gerado | `src/services/gcode-generator-v2.ts` |
| Mudar valores padrão | `src/utils/defaults.ts` |
| Adicionar validação CNC | `src/services/validator.ts` |
| Configurar rate limits | `src/middleware/rate-limit.ts` |
| Modificar variáveis de ambiente | `.env` + `src/config/index.ts` |

---

**Dúvidas?** Consulte o código diretamente ou verifique os testes em `src/__tests__/` para ver exemplos de uso real.
