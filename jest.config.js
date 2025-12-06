module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__mocks__/', // Ignora arquivos de mock
  ],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/src/__tests__/__mocks__/uuid.ts', // Mock do uuid para testes
  },
  collectCoverageFrom: [
    'src/services/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageThreshold: {
    './src/services/nesting-algorithm.ts': {
      branches: 60,
      functions: 75,
      lines: 85,
      statements: 84,
    },
    './src/services/gcode-generator-v2.ts': {
      branches: 35,
      functions: 90,
      lines: 40,
      statements: 40,
    },
  },
};
