# Contributing to CNC Builder API

First off, thank you for considering contributing to CNC Builder API! It's people like you that make this project better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Messages](#commit-messages)
- [Project Structure](#project-structure)

---

## Code of Conduct

This project and everyone participating in it is governed by respect and professionalism. By participating, you are expected to uphold this standard. Please be respectful, inclusive, and constructive in all interactions.

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git
- Basic knowledge of TypeScript and Express.js

### Setup Development Environment

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/cnc-builder-api.git
   cd cnc-builder-api
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/Thalikbussacro/cnc-builder-api.git
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up environment**
   ```bash
   cp .env.example .env
   ```

5. **Run tests to verify setup**
   ```bash
   npm test
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

---

## Development Process

### 1. Create a Branch

Always create a new branch for your work:

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 2. Make Your Changes

- Write clean, readable code
- Follow the existing code style
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Build to check for TypeScript errors
npm run build
```

### 4. Commit Your Changes

Follow the [commit message guidelines](#commit-messages) below.

```bash
git add .
git commit -m "feat: add new nesting algorithm"
```

---

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`npm test`)
- [ ] Code builds successfully (`npm run build`)
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] Commit messages follow the convention
- [ ] Code follows the style guidelines

### Submitting the PR

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template
   - Link any related issues

3. **PR Title Format**
   ```
   type(scope): description

   Examples:
   feat(nesting): add First-Fit algorithm
   fix(validation): correct area calculation
   docs(readme): update installation instructions
   test(e2e): add workflow tests
   ```

4. **PR Description Template**
   ```markdown
   ## Description
   Brief description of what this PR does

   ## Type of Change
   - [ ] Bug fix (non-breaking change which fixes an issue)
   - [ ] New feature (non-breaking change which adds functionality)
   - [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
   - [ ] Documentation update

   ## Testing
   - Describe the tests you added
   - How to manually test this change

   ## Related Issues
   Closes #123
   ```

### Review Process

- Maintainers will review your PR
- Address any requested changes
- Once approved, your PR will be merged
- Your contribution will be credited in the release notes

---

## Coding Standards

### TypeScript

- Use TypeScript for all code
- Leverage type safety - avoid `any` when possible
- Use interfaces for object shapes
- Use Zod for runtime validation

```typescript
// Good
interface Peca {
  id: string;
  largura: number;
  altura: number;
  tipoCorte: 'externo' | 'interno' | 'na-linha';
}

// Avoid
const peca: any = { ... };
```

### Code Style

- **Indentation**: 2 spaces
- **Semicolons**: Yes, use them
- **Quotes**: Single quotes for strings
- **Line Length**: Max 100 characters (flexible)
- **Imports**: Group and organize logically

```typescript
// Good
import { Router } from 'express';
import { z } from 'zod';

import { gerarGCode } from '../services/gcode-generator-v2';
import { posicionarPecas } from '../services/nesting-algorithm';
import { logger } from '../utils/logger';

const router = Router();
```

### Error Handling

- Use custom error classes
- Provide descriptive error messages
- Log errors appropriately

```typescript
// Good
if (!peca.largura || peca.largura <= 0) {
  throw new ValidationError('Largura deve ser maior que zero');
}

// Avoid
if (!peca.largura || peca.largura <= 0) {
  throw new Error('Invalid');
}
```

### Naming Conventions

- **Variables/Functions**: camelCase
- **Classes/Interfaces/Types**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Files**: kebab-case

```typescript
const userName = 'John';                    // Variables
function calculateArea() { }                // Functions
class GCodeGenerator { }                    // Classes
interface UserConfig { }                    // Interfaces
const MAX_RETRIES = 3;                      // Constants
// file: gcode-generator.ts                 // Files
```

---

## Testing Guidelines

### Test Structure

```typescript
describe('Feature Name', () => {
  describe('Specific Functionality', () => {
    it('should do something specific', () => {
      // Arrange
      const input = { ... };

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Test Types

#### Unit Tests (`src/**/*.test.ts`)
- Test individual functions and methods
- Mock external dependencies
- Fast execution

```typescript
// Example: src/services/nesting-algorithm.test.ts
it('deve posicionar uma peça simples', () => {
  const pecas = [{ largura: 100, altura: 100, tipoCorte: 'externo', id: '1' }];
  const resultado = posicionarPecas(pecas, configChapa);

  expect(resultado.posicionadas).toHaveLength(1);
});
```

#### Integration Tests (`src/__tests__/integration/**/*.test.ts`)
- Test API endpoints
- Test middleware interaction
- Use supertest

```typescript
// Example: src/__tests__/integration/gcode.test.ts
it('deve gerar G-code com sucesso', async () => {
  const response = await request(app)
    .post('/api/gcode/generate')
    .send({ pecas: [...] });

  expect(response.status).toBe(200);
  expect(response.body.gcode).toBeDefined();
});
```

#### E2E Tests (`src/__tests__/e2e/**/*.test.ts`)
- Test complete user workflows
- Test multiple endpoints together
- Verify end-to-end behavior

```typescript
// Example: src/__tests__/e2e/workflows.test.ts
it('deve completar fluxo: validar → gerar → cache', async () => {
  // 1. Validate
  const validation = await request(app).post('/api/gcode/validate').send(payload);

  // 2. Generate
  const generation = await request(app).post('/api/gcode/generate').send(payload);

  // 3. Verify cache
  const cached = await request(app).post('/api/gcode/validate').send(payload);
  expect(cached.body).toEqual(validation.body);
});
```

### Test Coverage

- Aim for >80% coverage
- All new features must have tests
- Bug fixes should include regression tests

---

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `style`: Code style changes (formatting, etc.)
- `chore`: Build process or auxiliary tool changes

### Scope (optional)

- `nesting`: Nesting algorithms
- `gcode`: G-code generation
- `validation`: Input validation
- `cache`: Caching system
- `middleware`: Express middlewares
- `tests`: Test infrastructure

### Examples

```bash
# Feature
git commit -m "feat(nesting): add First-Fit algorithm"

# Bug fix
git commit -m "fix(validation): correct area calculation for rotated pieces"

# Documentation
git commit -m "docs(readme): add deployment instructions"

# Test
git commit -m "test(e2e): add complete workflow tests"

# With body
git commit -m "refactor(gcode): simplify tool path generation

- Extract common path logic
- Add helper functions
- Improve readability"
```

---

## Project Structure

### Directory Overview

```
src/
├── __tests__/           # All tests
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   ├── e2e/             # End-to-end tests
│   └── __mocks__/       # Test mocks
├── config/              # Configuration
│   ├── index.ts         # Environment config
│   └── swagger.ts       # Swagger/OpenAPI spec
├── middleware/          # Express middlewares
│   ├── error-handler.ts # Global error handler
│   ├── rate-limit.ts    # Rate limiting
│   ├── request-id.ts    # Request ID tracking
│   └── sanitize.ts      # Input sanitization
├── routes/              # API routes
│   ├── gcode.routes.ts  # G-code endpoints
│   └── health.routes.ts # Health check endpoints
├── schemas/             # Zod validation schemas
│   └── gcode.schema.ts  # G-code request schemas
├── services/            # Business logic
│   ├── cache.ts         # Validation cache
│   ├── gcode-generator-v2.ts
│   ├── nesting-algorithm.ts
│   └── validator.ts     # Configuration validator
├── types/               # TypeScript type definitions
│   └── index.ts
├── utils/               # Utility functions
│   ├── defaults.ts      # Default configurations
│   └── logger.ts        # Winston logger
└── server.ts            # Express app setup
```

### Adding New Features

1. **Services** (`src/services/`): Core business logic
2. **Routes** (`src/routes/`): API endpoints
3. **Schemas** (`src/schemas/`): Request/response validation
4. **Middleware** (`src/middleware/`): Request processing
5. **Tests**: Always add corresponding tests

---

## Questions?

- **Issues**: [GitHub Issues](https://github.com/Thalikbussacro/cnc-builder-api/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Thalikbussacro/cnc-builder-api/discussions)

---

## Recognition

Contributors will be recognized in:
- Release notes
- CONTRIBUTORS.md file (if we create one)
- Git history

Thank you for contributing! 🎉
