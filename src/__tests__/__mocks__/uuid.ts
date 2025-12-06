/**
 * Mock do pacote uuid para testes
 * Gera UUIDs determinísticos para facilitar assertions
 */

let mockCounter = 0;

export function v4(): string {
  mockCounter++;
  // Gera um UUID v4 válido de forma determinística
  const hex = mockCounter.toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
}

// Reset do counter (útil para testes)
export function __resetCounter__() {
  mockCounter = 0;
}
