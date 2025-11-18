# CNC Builder API

REST API for G-code generation with intelligent nesting algorithms for CNC machines.

## Features

- ✅ **3 Nesting Algorithms**: Greedy, Shelf, and Guillotine
- ✅ **Optimized G-code V2**: Efficient tool paths with ramp support
- ✅ **Smart Defaults**: Minimal required parameters
- ✅ **Time Estimation**: Accurate cutting time calculations
- ✅ **Validation**: Input validation with descriptive errors
- ✅ **TypeScript**: Full type safety

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express 4
- **Language**: TypeScript 5
- **Architecture**: Stateless REST API

## Prerequisites

- Node.js 18 or higher
- npm or yarn

## Installation

```bash
# Clone the repository
git clone https://github.com/Thalikbussacro/cnc-builder-api.git
cd cnc-builder-api

# Install dependencies
npm install

# Copy environment file (optional)
cp .env.example .env
```

## Development

```bash
# Start development server with hot reload
npm run dev

# Server will start at http://localhost:3001
```

## Build

```bash
# Compile TypeScript to JavaScript
npm run build

# Output will be in dist/ folder
```

## Production

```bash
# Build and start production server
npm run build
npm start
```

## Testing

```bash
# Run manual test suite (requires server running)
bash test/manual-tests.sh
```

**Testing with Postman?** See the complete guide: [POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment (development/production) |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins (comma-separated) |

## API Endpoints

### Health Check
```
GET /health
```

### Generate G-code
```
POST /api/gcode/generate
```

For detailed API documentation, see [API_DOCS.md](./API_DOCS.md).

**Want to test with Postman?** See [POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md) for step-by-step instructions.

## Quick Example

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

## Project Structure

```
cnc-builder-api/
├── src/
│   ├── routes/          # API routes
│   ├── services/        # Business logic (G-code, nesting, validation)
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utilities (defaults, helpers)
│   └── server.ts        # Express server setup
├── test/                # Manual test scripts
├── dist/                # Compiled JavaScript (generated)
└── package.json
```

## Related Projects

- **Frontend**: [cnc-builder-web](https://github.com/Thalikbussacro/cnc-builder-web) - Next.js UI

## License

ISC

## Contributing

This is a personal project. Issues and pull requests are welcome.
