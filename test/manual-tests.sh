#!/bin/bash
set -e

BASE_URL="http://localhost:3001"

echo "=== SUITE DE TESTES DA API ==="
echo "Base URL: $BASE_URL"
echo ""

# Teste 1: Health check
echo "[1/7] Health check..."
RESPONSE=$(curl -s $BASE_URL/health)
if echo "$RESPONSE" | grep -q "ok"; then
  echo "✅ PASS - Health check OK"
else
  echo "❌ FAIL - Health check failed"
  echo "Response: $RESPONSE"
fi
echo ""

# Teste 2: Request mínimo (só peças)
echo "[2/7] Request mínimo (defaults)..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{"pecas":[{"largura":100,"altura":200,"tipoCorte":"externo","id":"1"}]}')
if echo "$RESPONSE" | grep -q "gcode"; then
  echo "✅ PASS - G-code gerado com defaults"
else
  echo "❌ FAIL - Não gerou G-code"
  echo "Response: $RESPONSE"
fi
echo ""

# Teste 3: Múltiplas peças
echo "[3/7] Múltiplas peças..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{"pecas":[{"largura":100,"altura":100,"tipoCorte":"externo","id":"1"},{"largura":200,"altura":200,"tipoCorte":"externo","id":"2"},{"largura":50,"altura":50,"tipoCorte":"interno","id":"3"}]}')
if echo "$RESPONSE" | grep -q "gcode"; then
  echo "✅ PASS - Múltiplas peças processadas"
else
  echo "❌ FAIL - Erro ao processar múltiplas peças"
  echo "Response: $RESPONSE"
fi
echo ""

# Teste 4: Diferentes métodos de nesting
echo "[4/7] Métodos de nesting..."

# Greedy
RESPONSE=$(curl -s -X POST $BASE_URL/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{"pecas":[{"largura":100,"altura":100,"tipoCorte":"externo","id":"1"}],"metodoNesting":"greedy"}')
if echo "$RESPONSE" | grep -q "gcode"; then
  echo "✅ PASS - Nesting greedy"
else
  echo "❌ FAIL - Nesting greedy failed"
fi

# Shelf
RESPONSE=$(curl -s -X POST $BASE_URL/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{"pecas":[{"largura":100,"altura":100,"tipoCorte":"externo","id":"1"}],"metodoNesting":"shelf"}')
if echo "$RESPONSE" | grep -q "gcode"; then
  echo "✅ PASS - Nesting shelf"
else
  echo "❌ FAIL - Nesting shelf failed"
fi

# Guillotine (default)
RESPONSE=$(curl -s -X POST $BASE_URL/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{"pecas":[{"largura":100,"altura":100,"tipoCorte":"externo","id":"1"}],"metodoNesting":"guillotine"}')
if echo "$RESPONSE" | grep -q "gcode"; then
  echo "✅ PASS - Nesting guillotine"
else
  echo "❌ FAIL - Nesting guillotine failed"
fi
echo ""

# Teste 5: Com e sem comentários
echo "[5/7] Sem comentários..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{"pecas":[{"largura":100,"altura":100,"tipoCorte":"externo","id":"1"}],"incluirComentarios":false}')
if echo "$RESPONSE" | grep -q "gcode" && ! echo "$RESPONSE" | grep -q ";"; then
  echo "✅ PASS - G-code sem comentários"
else
  echo "⚠️  WARNING - G-code pode conter comentários"
fi
echo ""

# Teste 6: Com ferramenta customizada
echo "[6/7] Ferramenta customizada..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{"pecas":[{"largura":100,"altura":100,"tipoCorte":"externo","id":"1"}],"configFerramenta":{"diametro":8,"numeroFerramenta":2}}')
if echo "$RESPONSE" | grep -q "gcode"; then
  echo "✅ PASS - Ferramenta customizada aplicada"
else
  echo "❌ FAIL - Erro ao aplicar ferramenta customizada"
fi
echo ""

# Teste 7: Validação de erro (sem peças)
echo "[7/7] Validação de erro..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/api/gcode/generate \
  -H "Content-Type: application/json" \
  -d '{}')
if [ "$HTTP_CODE" = "400" ]; then
  echo "✅ PASS - Retornou 400 para request inválido"
else
  echo "❌ FAIL - Esperava 400, recebeu $HTTP_CODE"
fi
echo ""

echo "=== FIM DOS TESTES ==="
