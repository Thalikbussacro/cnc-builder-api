# API Documentation

Complete documentation for the CNC Builder API endpoints.

## Base URL

```
http://localhost:3001
```

For production, replace with your deployed API URL.

---

## Endpoints

### Health Check

#### `GET /health`

Returns API status and current timestamp.

**Response (200)**
```json
{
  "status": "ok",
  "timestamp": "2025-11-18T03:00:00.000Z"
}
```

**Example**
```bash
curl http://localhost:3001/health
```

---

### Generate G-code

#### `POST /api/gcode/generate`

Generates optimized G-code from pieces and machine configurations.

**Request Body**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pecas` | `Peca[]` | ✅ Yes | - | Array of pieces to cut |
| `configChapa` | `Partial<ConfiguracoesChapa>` | No | See defaults | Sheet dimensions and thickness |
| `configCorte` | `Partial<ConfiguracoesCorte>` | No | See defaults | Cutting parameters |
| `configFerramenta` | `Partial<ConfiguracoesFerramenta>` | No | `undefined` | Tool compensation (optional) |
| `metodoNesting` | `'greedy' \| 'shelf' \| 'guillotine'` | No | `'guillotine'` | Nesting algorithm |
| `incluirComentarios` | `boolean` | No | `true` | Include comments in G-code |

**Peca Type**
```typescript
{
  largura: number;      // Width in mm
  altura: number;       // Height in mm
  tipoCorte: 'externo' | 'interno' | 'na-linha';
  id: string;           // Unique identifier
  nome?: string;        // Optional name
  ignorada?: boolean;   // If true, reserves space but doesn't cut
}
```

**Response (200)**
```json
{
  "gcode": "G21\nG90\n...",
  "metadata": {
    "linhas": 450,
    "tamanhoBytes": 12500,
    "tempoEstimado": {
      "tempoCorte": 120.5,
      "tempoMergulho": 30.2,
      "tempoPosicionamento": 15.8,
      "tempoTotal": 166.5,
      "distanciaCorte": 2400,
      "distanciaMergulho": 60,
      "distanciaPosicionamento": 320,
      "distanciaTotal": 2780
    },
    "metricas": {
      "areaUtilizada": 45000,
      "eficiencia": 85.5,
      "tempo": 12.3
    },
    "configuracoes": {
      "chapa": { ... },
      "corte": { ... },
      "ferramenta": { ... },
      "nesting": {
        "metodo": "guillotine",
        "pecasPosicionadas": 5,
        "eficiencia": 85.5
      }
    }
  }
}
```

**Error (400) - Missing pieces**
```json
{
  "error": "Parâmetro 'pecas' é obrigatório e deve ser array não vazio"
}
```

**Error (400) - Pieces don't fit**
```json
{
  "error": "Algumas peças não couberam na chapa",
  "naoCouberam": [
    {
      "id": "3",
      "nome": "Peça Grande",
      "largura": 3000,
      "altura": 2000
    }
  ]
}
```

**Error (500) - Internal error**
```json
{
  "error": "Erro ao gerar G-code",
  "message": "Error details..."
}
```

---

## Default Configurations

If not specified, the following defaults are used:

### `configChapa` (Sheet)
```typescript
{
  largura: 2850,      // Width: 2850mm
  altura: 1500,       // Height: 1500mm
  espessura: 15       // Thickness: 15mm
}
```

### `configCorte` (Cutting)
```typescript
{
  profundidade: 15,                    // Depth: 15mm
  espacamento: 50,                     // Spacing between pieces: 50mm
  profundidadePorPassada: 4,           // Depth per pass: 4mm
  feedrate: 1500,                      // Cutting speed: 1500mm/min
  plungeRate: 500,                     // Plunge speed: 500mm/min
  rapidsSpeed: 4000,                   // Rapids speed: 4000mm/min
  spindleSpeed: 18000,                 // Spindle RPM: 18000
  usarRampa: false,                    // Use ramp entry: false
  anguloRampa: 3,                      // Ramp angle: 3°
  aplicarRampaEm: 'primeira-passada',  // Apply ramp on: first pass only
  usarMesmoEspacamentoBorda: true,     // Use same spacing for edges
  margemBorda: 50                      // Edge margin: 50mm
}
```

### `configFerramenta` (Tool)
```typescript
{
  diametro: 6,          // Diameter: 6mm
  numeroFerramenta: 1   // Tool number: 1
}
```
**Note:** If not provided, no tool compensation (G41/G42) is applied.

---

## Examples

### Minimal Request (only pieces)

```bash
curl -X POST http://localhost:3001/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{
    "pecas": [
      {
        "largura": 100,
        "altura": 200,
        "tipoCorte": "externo",
        "id": "1"
      }
    ]
  }'
```

### Custom Sheet and Spacing

```bash
curl -X POST http://localhost:3001/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{
    "pecas": [
      {
        "largura": 100,
        "altura": 200,
        "tipoCorte": "externo",
        "id": "1",
        "nome": "Side Panel"
      }
    ],
    "configChapa": {
      "largura": 1000,
      "altura": 1000,
      "espessura": 10
    },
    "configCorte": {
      "profundidade": 10,
      "espacamento": 30
    }
  }'
```

### Different Nesting Algorithm

```bash
curl -X POST http://localhost:3001/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{
    "pecas": [...],
    "metodoNesting": "shelf"
  }'
```

### Without Comments

```bash
curl -X POST http://localhost:3001/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{
    "pecas": [...],
    "incluirComentarios": false
  }'
```

### JavaScript Fetch Example

```javascript
const response = await fetch('http://localhost:3001/api/gcode/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pecas: [
      { largura: 100, altura: 200, tipoCorte: 'externo', id: '1' }
    ],
    metodoNesting: 'guillotine',
    incluirComentarios: true
  })
});

const { gcode, metadata } = await response.json();

console.log('G-code generated:', gcode.substring(0, 200));
console.log('Estimated time:', metadata.tempoEstimado.tempoTotal, 'seconds');
console.log('Efficiency:', metadata.nesting.eficiencia, '%');
```

### TypeScript Example

```typescript
import type { Peca } from './types';

interface GenerateRequest {
  pecas: Peca[];
  metodoNesting?: 'greedy' | 'shelf' | 'guillotine';
  incluirComentarios?: boolean;
}

async function generateGCode(request: GenerateRequest) {
  const response = await fetch('http://localhost:3001/api/gcode/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Usage
const result = await generateGCode({
  pecas: [
    { largura: 100, altura: 200, tipoCorte: 'externo', id: '1' }
  ]
});

console.log(result.metadata);
```

---

## Nesting Algorithms

### Greedy (First-Fit Decreasing)
- Sorts pieces by area (largest first)
- Places each piece in the first available position
- **Best for**: Mixed sizes with moderate complexity

### Shelf
- Groups pieces horizontally in "shelves"
- Optimizes row-by-row placement
- **Best for**: Pieces with similar heights

### Guillotine
- Uses recursive binary space partitioning
- Creates orthogonal cuts only
- **Best for**: Maximum material efficiency (default)

---

## Rate Limiting

Currently no rate limiting is applied. In production, consider:
- 100 requests per 15 minutes per IP
- Configurable via environment variables

---

## CORS

By default, CORS is enabled for all origins. Configure `ALLOWED_ORIGINS` environment variable for production.

---

## Support

For issues or questions, open an issue on [GitHub](https://github.com/Thalikbussacro/cnc-builder-api/issues).
