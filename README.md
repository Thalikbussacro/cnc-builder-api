# CNC Builder API

<div align="center">

**REST API for G-code generation with intelligent nesting algorithms for CNC machines**

[![Tests](https://img.shields.io/badge/tests-75%20passing-brightgreen)](https://github.com/Thalikbussacro/cnc-builder-api)
[![Coverage](https://img.shields.io/badge/coverage-85%25-green)](https://github.com/Thalikbussacro/cnc-builder-api)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [API](#-api-endpoints) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### Core Functionality
- ✅ **3 Nesting Algorithms**: Greedy, Shelf, and Guillotine for optimal part placement
- ✅ **Optimized G-code V2**: Efficient tool paths with ramp support and time estimation
- ✅ **Smart Validation**: Pre-generation validation with detailed preview and warnings
- ✅ **Intelligent Cache**: 5-minute TTL cache for validation results with hit rate tracking
- ✅ **Request Tracing**: Unique Request ID for every request (UUID v4)

### Security & Performance
- ✅ **Rate Limiting**: Global (100 req/15min) + Per-endpoint (20 req/min)
- ✅ **Security Headers**: Helmet.js with API-specific configuration
- ✅ **CORS Protection**: Restrictive CORS with environment-based origins
- ✅ **Input Sanitization**: Validator.js integration
- ✅ **Request Timeouts**: 30s for generation, 10s for validation
- ✅ **Response Compression**: Gzip compression for responses > 1KB

### Monitoring & Observability
- ✅ **Health Checks**: Basic `/health`, detailed `/health/detailed`, Kubernetes `/ready` and `/live`
- ✅ **Cache Statistics**: Real-time cache hit/miss rates
- ✅ **Structured Logging**: Winston with console + file transports
- ✅ **Request ID Tracking**: Propagated across all logs and responses

### Developer Experience
- ✅ **OpenAPI/Swagger**: Interactive API documentation at `/api-docs`
- ✅ **Full TypeScript**: 100% type safety with Zod runtime validation
- ✅ **Comprehensive Tests**: 75 tests (unit + integration + E2E)
- ✅ **Smart Defaults**: Minimal required parameters with sensible defaults

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18 or higher
- **npm** or **yarn**

### Installation

```bash
# Clone the repository
git clone https://github.com/Thalikbussacro/cnc-builder-api.git
cd cnc-builder-api

# Install dependencies
npm install

# Configure environment (optional)
cp .env.example .env

# Start development server
npm run dev

# Server will start at http://localhost:3001
```

### First Request

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

---

## 📚 Documentation

### Interactive API Documentation
Visit **[http://localhost:3001/api-docs](http://localhost:3001/api-docs)** for full interactive Swagger documentation with:
- Complete request/response schemas
- Try-it-out functionality
- Rate limit information
- Error response examples

### Additional Documentation
- **[POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md)** - Step-by-step Postman testing guide
- **[API_DOCS.md](./API_DOCS.md)** - Detailed API documentation
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines

---

## 🔌 API Endpoints

### G-code Generation

#### `POST /api/gcode/generate`
Generate optimized G-code for CNC machining.

**Rate Limit:** 20 requests/minute
**Timeout:** 30 seconds

```json
{
  "pecas": [
    { "id": "1", "largura": 100, "altura": 200, "tipoCorte": "externo" }
  ],
  "metodoNesting": "guillotine",
  "incluirComentarios": true
}
```

#### `POST /api/gcode/validate`
Validate configuration and get preview without generating G-code.

**Rate Limit:** 20 requests/minute
**Timeout:** 10 seconds
**Cache:** 5 minutes TTL

```json
{
  "pecas": [
    { "id": "1", "largura": 100, "altura": 200, "tipoCorte": "externo" }
  ]
}
```

### Monitoring

#### `GET /health`
Basic health check for load balancers.

#### `GET /health/detailed`
Detailed health with CPU, memory, and cache statistics.

#### `GET /ready`
Readiness probe for Kubernetes.

#### `GET /live`
Liveness probe for Kubernetes.

### Cache

#### `GET /api/cache/stats`
Cache hit/miss statistics.

---

## 🏗️ Project Structure

```
cnc-builder-api/
├── src/
│   ├── __tests__/           # Test suites
│   │   ├── unit/            # Unit tests
│   │   ├── integration/     # Integration tests
│   │   └── e2e/             # End-to-end tests
│   ├── config/              # Configuration (env, swagger)
│   ├── middleware/          # Express middlewares
│   │   ├── error-handler.ts
│   │   ├── rate-limit.ts
│   │   ├── request-id.ts
│   │   └── sanitize.ts
│   ├── routes/              # API routes
│   ├── schemas/             # Zod validation schemas
│   ├── services/            # Business logic
│   │   ├── cache.ts
│   │   ├── gcode-generator-v2.ts
│   │   ├── nesting-algorithm.ts
│   │   └── validator.ts
│   ├── types/               # TypeScript types
│   ├── utils/               # Utilities
│   │   ├── defaults.ts
│   │   └── logger.ts
│   └── server.ts            # Express server setup
├── dist/                    # Compiled JavaScript (generated)
├── .env.example             # Environment variables template
└── package.json
```

---

## 🧪 Testing

```bash
# Run all tests (75 tests)
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

**Test Coverage:**
- **Unit Tests**: 30 tests (nesting algorithms, G-code generation)
- **Integration Tests**: 32 tests (API endpoints, health checks)
- **E2E Tests**: 13 tests (complete workflows, caching, algorithms)

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment (`development`, `production`, `test`) |
| `PORT` | `3001` | Server port |
| `LOG_LEVEL` | `info` | Logging level (`error`, `warn`, `info`, `debug`) |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS allowed origins (comma-separated) |

### Nesting Algorithms

- **Greedy**: Fast, simple first-fit algorithm
- **Shelf**: Horizontal shelf-based packing
- **Guillotine**: Recursive guillotine cuts (default, best efficiency)

### Rate Limiting

- **Global API**: 100 requests per 15 minutes
- **G-code Generation**: 20 requests per minute
- **Validation**: 20 requests per minute

---

## 🔧 Development

```bash
# Start development server with hot reload
npm run dev

# Compile TypeScript
npm run build

# Start production server
npm start
```

---

## 📊 Performance

- **Cache**: 5-minute TTL with ~75% hit rate on validation
- **Compression**: Gzip for responses > 1KB
- **Algorithm Speed**: < 2s for 500 parts
- **Request Timeout**: 30s generation, 10s validation

---

## 🔒 Security

- **Helmet.js**: Security headers with API-specific configuration
- **CORS**: Restrictive origin whitelist
- **Input Sanitization**: All user input sanitized
- **Request Size Limit**: 2MB maximum payload
- **Array Validation**: Max 1000 items per array
- **Timeout Protection**: Automatic timeout for long requests

---

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Configure `ALLOWED_ORIGINS` for your domain
3. Set `LOG_LEVEL=warn` for production
4. Ensure `NODE_ENV=production`

### Health Checks

Configure your load balancer/Kubernetes:
- **Liveness**: `GET /live`
- **Readiness**: `GET /ready`
- **Health**: `GET /health`

---

## 📈 Monitoring

### Health Check Example

```bash
# Basic health
curl http://localhost:3001/health

# Detailed metrics
curl http://localhost:3001/health/detailed

# Cache statistics
curl http://localhost:3001/api/cache/stats
```

### Response Headers

Every response includes:
- `X-Request-ID`: Unique request identifier (UUID v4)
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Timestamp when limit resets

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

### Development Flow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📝 License

ISC - See [LICENSE](./LICENSE) for details

---

## 🔗 Related Projects

- **Frontend**: [cnc-builder-web](https://github.com/Thalikbussacro/cnc-builder-web) - Next.js UI for CNC Builder

---

<div align="center">

**Made with ❤️ for the CNC community**

</div>
