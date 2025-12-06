module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
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
