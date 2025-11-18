# Migração: G-Code Generator para API REST Standalone

**Objetivo:** Separar responsabilidades arquiteturais extraindo toda a lógica de geração de G-code para uma API REST independente usando Node.js + Express, mantendo o frontend Next.js como cliente puro.

---

## 📊 Status da Migração

| Fase | Status | Checkpoint | Commit |
|------|--------|------------|--------|
| **Fase 1** - Configuração do Projeto | ✅ Concluída | `npm run dev` executa | `b04b004` |
| **Fase 2** - Migração da Lógica | ✅ Concluída | Compilação sem erros | `bee6ece` |
| **Fase 3** - API REST | ✅ Concluída | Endpoints funcionais | `7ae67b2` |
| **Fase 4** - Testes e Docs | ✅ Concluída | 7/7 testes passando | `0315ca2` |
| **Fase 5** - Integração Frontend | ⏸️ Pendente | - | - |
| **Fase 6** - Deploy Produção | ⏸️ Pendente | - | - |

**Última atualização:** 18/11/2025

**API Status:** ✅ Funcional e documentada (localhost:3001)

---

## Princípios da Migração

- **SimplicityFirst**: Começar com endpoints mínimos, expandir conforme necessário
- **Incremental**: Cada fase é testável e deployável isoladamente
- **Apenas V2**: Usar exclusivamente o gerador V2 otimizado
- **Defaults Inteligentes**: API deve funcionar com mínimo de parâmetros obrigatórios
- **Sem Fallback**: Remover completamente lógica client-side, API é fonte única de verdade

## Arquitetura Atual (Baseline)

O projeto **cnc-builder-web** é atualmente 100% client-side:
- ❌ Sem backend (Next.js apenas para UI)
- ❌ Sem banco de dados (usa localStorage)
- ✅ Todo processamento no navegador
- ✅ Sem latência de rede
- ✅ Performance não é problema

**Funcionalidades a migrar:**
- Gerador G-code V2 (`lib/gcode-generator-v2.ts`)
- 3 algoritmos de nesting (greedy, shelf, guillotine)
- Validações de configuração
- Cálculo de tempo estimado
- Otimização TSP de ordem de corte

---

## Fase 1: Configuração do Projeto API

**Objetivo:** Criar estrutura base funcional e testável

### 1.1 Criar estrutura base do projeto API

- [x] Inicializar projeto Node.js
- [x] Configurar TypeScript
- [x] Instalar dependências base:
  ```bash
  npm install express cors
  npm install -D typescript @types/node @types/express @types/cors ts-node-dev
  ```

### 1.2 Configurar estrutura de pastas
```
cnc-builder-api/
├── src/
│   ├── routes/
│   │   └── gcode.routes.ts
│   ├── services/
│   │   ├── gcode-generator-v2.ts
│   │   ├── nesting-algorithm.ts
│   │   └── validator.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── defaults.ts
│   └── server.ts
├── package.json
├── tsconfig.json
└── .env.example
```

- [x] Criar estrutura de diretórios
- [x] Configurar `tsconfig.json` com strict mode
- [x] Criar `.gitignore` (node_modules, dist, .env)

### 1.3 Configurar scripts do package.json
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

- [x] Adicionar scripts
- [x] Testar `npm run dev` (deve falhar, ainda não temos server.ts)

### ✅ Checkpoint 1.1: Estrutura criada
**Teste:** `npm run dev` executa (mesmo que dê erro de arquivo faltando)

---

## Fase 2: Migração da Lógica de Negócio

**Objetivo:** Copiar código existente e adaptá-lo para funcionar server-side

### 2.1 Copiar tipos TypeScript
- [x] Copiar `types/index.ts` do projeto web
- [x] Verificar compilação: `npm run build`
- [x] Ajustar imports se necessário (remover `@/` alias)

### 2.2 Migrar algoritmo de nesting
- [x] Copiar `lib/nesting-algorithm.ts`
- [x] Ajustar imports: trocar `@/types` por `../types`
- [x] **CRÍTICO**: Remover dependências de browser (se houver `window`, `document`, etc)
- [x] Testar compilação

### 2.3 Migrar gerador G-code V2
- [x] Copiar `lib/gcode-generator-v2.ts`
- [x] Copiar funções auxiliares necessárias de `lib/gcode-generator.ts` (apenas `calcularTempoEstimado()` e `formatarTempo()`)
- [x] Ajustar imports
- [x] **CRÍTICO**: Remover `downloadGCode()` (depende de DOM)
- [x] Consolidar tudo em um único arquivo `gcode-generator-v2.ts` no backend

### 2.4 Migrar validações
- [x] Copiar `lib/validator.ts` e `lib/validation-rules.ts`
- [x] Ajustar imports
- [x] Testar compilação

### 2.5 Criar sistema de defaults

Criar `src/utils/defaults.ts`:

```typescript
import type { ConfiguracoesChapa, ConfiguracoesCorte, ConfiguracoesFerramenta } from '../types';

export const DEFAULT_CONFIG_CHAPA: ConfiguracoesChapa = {
  largura: 2850,
  altura: 1500,
  espessura: 15,
};

export const DEFAULT_CONFIG_CORTE: ConfiguracoesCorte = {
  profundidade: 15,
  espacamento: 50,
  profundidadePorPassada: 4,
  feedrate: 1500,
  plungeRate: 500,
  rapidsSpeed: 4000,
  spindleSpeed: 18000,
  usarRampa: false,
  anguloRampa: 3,
  aplicarRampaEm: 'primeira-passada',
  usarMesmoEspacamentoBorda: true,
  margemBorda: 50,
};

export const DEFAULT_CONFIG_FERRAMENTA: ConfiguracoesFerramenta = {
  diametro: 6,
  numeroFerramenta: 1,
};

/**
 * Mescla configurações fornecidas com defaults
 */
export function mergeWithDefaults<T>(partial: Partial<T>, defaults: T): T {
  return { ...defaults, ...partial };
}
```

### ✅ Checkpoint 2.1: Lógica migrada
**Teste:** Todos arquivos compilam sem erro (`npm run build`)

---

## Fase 3: Implementação da API REST

**Objetivo:** Criar servidor Express funcional com endpoint único de geração

### 3.1 Configurar servidor Express

Criar `src/server.ts`

### 3.2 Criar endpoint de geração

Criar `src/routes/gcode.routes.ts`:

**Endpoint:** `POST /api/gcode/generate`

**Request Body (todos campos opcionais exceto 'pecas'):**
```typescript
{
  pecas: Peca[],                          // OBRIGATÓRIO
  configChapa?: Partial<ConfiguracoesChapa>,
  configCorte?: Partial<ConfiguracoesCorte>,
  configFerramenta?: Partial<ConfiguracoesFerramenta>,
  metodoNesting?: 'greedy' | 'shelf' | 'guillotine',  // Default: guillotine
  incluirComentarios?: boolean            // Default: true
}
```

**Response:**
```typescript
{
  gcode: string,
  metadata: {
    linhas: number,
    tamanhoBytes: number,
    tempoEstimado: { ... },
    metricas: { areaUtilizada, eficiencia },
    configuracoes: { ... }  // Configurações finais aplicadas
  }
}
```

### 3.3 Testar endpoint localmente

**Testes obrigatórios:**
- [x] `npm run dev` - servidor sobe sem erros
- [x] `curl http://localhost:3001/health` - retorna `{"status":"ok"}`
- [x] Teste mínimo - gera G-code com defaults
- [x] Teste completo - gera G-code com configs customizadas
- [x] Validar que G-code gerado está correto
- [x] Validar metadata (linhas, bytes, tempo, métricas)

### ✅ Checkpoint 3.1: API funcional
**Teste:** Conseguir gerar G-code via curl/Postman com sucesso

---

## Fase 4: Testes e Documentação

**Objetivo:** Garantir que API funciona corretamente e está documentada

### 4.1 Bateria de testes completa

**Estratégia:** Testes manuais via curl/Postman (testes automatizados são melhorias futuras)

Criar script `test/manual-tests.sh` para validar:
1. Health check
2. Request mínimo (só peças)
3. Múltiplas peças
4. Diferentes métodos de nesting
5. Com e sem comentários
6. Ferramenta customizada
7. Validação de erro (sem peças)

### 4.2 Documentação da API

Criar `README.md` com:
- Instruções de setup e instalação
- Comandos de desenvolvimento
- Variáveis de ambiente

Criar `API_DOCS.md` com:
- Base URL
- Endpoints disponíveis
- Parâmetros de entrada/saída
- Exemplos de uso (curl, fetch)
- Configurações padrão
- Códigos de erro

### 4.3 Variáveis de ambiente

Criar `.env.example`:
```bash
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### ✅ Checkpoint 4.1: API testada e documentada
**Teste:** Todos testes passam + documentação completa

---

## Fase 5: Integração com Frontend

**Objetivo:** Conectar frontend Next.js à API e remover processamento client-side

### 5.1 Criar cliente da API

Criar `lib/api-client.ts` no projeto **cnc-builder-web**

### 5.2 Migrar app/page.tsx para usar API

Modificar handler de geração para chamar API:
- Adicionar estados `carregando` e `erro`
- Modificar `handleVisualizarGCode` para async
- Adicionar loading state no botão
- Adicionar mensagem de erro na UI

### 5.3 Remover lógica client-side (APÓS testar integração)

**IMPORTANTE:** Só fazer isso DEPOIS que API estiver 100% funcional!

- [ ] Remover `lib/gcode-generator.ts`
- [ ] Remover `lib/gcode-generator-v2.ts`
- [ ] Remover `lib/nesting-algorithm.ts`
- [ ] Remover `lib/validator.ts` e `lib/validation-rules.ts`
- [ ] Limpar imports não usados
- [ ] Testar build: `npm run build`

### 5.4 Testes de integração

- [ ] Servidor API rodando
- [ ] Frontend rodando
- [ ] Testar geração de G-code end-to-end
- [ ] Verificar que não há erros no console

### ✅ Checkpoint 5.1: Frontend integrado
**Teste:** Conseguir gerar G-code pelo frontend usando a API

---

## Fase 6: Deploy e Produção

**Objetivo:** Colocar API em produção e conectar frontend

### 6.1 Preparar API para produção

Adicionar:
- Helmet (segurança)
- Compression (performance)
- Rate limiting

### 6.2 Deploy da API (Render.com)

### 6.3 Configurar frontend para produção

Criar `.env.production` com URL da API

### 6.4 Deploy do frontend (Vercel)

### 6.5 Configurar CORS na API para produção

### ✅ Checkpoint 6.1: Em produção!
**Teste:** App funcionando 100% em produção via URL pública

---

## Melhorias Futuras (Opcional)

### Segurança
- [ ] Implementar API keys para autenticação
- [ ] Adicionar HTTPS obrigatório
- [ ] Implementar logs de auditoria

### Performance
- [ ] Adicionar cache Redis para G-codes repetidos
- [ ] Implementar fila de jobs para geração assíncrona (BullMQ)
- [ ] Monitoramento com Prometheus/Grafana

### Novos Recursos
- [ ] Endpoint `/api/validate` - validar sem gerar
- [ ] Endpoint `/api/preview` - prévia de nesting sem G-code
- [ ] Suporte a outros formatos de saída (DXF, SVG)
- [ ] Histórico de G-codes gerados (com banco de dados)

---

## Checklist Final

### API
- [ ] Código compilando sem erros
- [ ] Testes manuais passando
- [ ] Documentação completa (`API_DOCS.md`)
- [ ] Deploy em produção (Render)
- [ ] Health check acessível
- [ ] CORS configurado

### Frontend
- [ ] Cliente API implementado (`lib/api-client.ts`)
- [ ] Integração testada localmente
- [ ] Loading states implementados
- [ ] Tratamento de erros na UI
- [ ] Lógica client-side removida
- [ ] Deploy em produção (Vercel)

### Integração
- [ ] Frontend consegue chamar API em dev
- [ ] Frontend consegue chamar API em prod
- [ ] Sem erros CORS
- [ ] Geração de G-code funcionando end-to-end
- [ ] Download de arquivos funcionando

---

## Resumo da Arquitetura Final

```
┌─────────────────────────────────────────┐
│   Frontend (Next.js)                    │
│   - Vercel                              │
│   - React + TypeScript                  │
│   - UI/UX apenas                        │
│   - LocalStorage para preferências      │
└──────────────┬──────────────────────────┘
               │ HTTP/JSON
               │ POST /api/gcode/generate
               ▼
┌─────────────────────────────────────────┐
│   Backend API (Node.js + Express)       │
│   - Render.com                          │
│   - TypeScript                          │
│   - Gerador V2                          │
│   - 3 algoritmos de nesting             │
│   - Validações                          │
│   - Defaults inteligentes               │
└─────────────────────────────────────────┘
```

**Benefícios alcançados:**
✅ Separação clara de responsabilidades
✅ Frontend leve e rápido
✅ Backend reutilizável (pode ser usado por outros clientes)
✅ Escalável (pode adicionar cache, fila, etc)
✅ Manutenção facilitada (mudanças na lógica não afetam UI)

---

**Stack Tecnológico Final:**
- **Backend:** Node.js 18+, Express 4, TypeScript 5
- **Frontend:** Next.js 15, React 19, TypeScript 5
- **Deploy:** Render.com (API) + Vercel (Frontend)
- **Segurança:** Helmet, CORS, Rate Limiting
