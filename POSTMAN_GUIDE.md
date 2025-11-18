# Guia de Testes com Postman

Este guia mostra como configurar e testar a API CNC Builder usando o Postman.

## Sumário

- [Instalação e Setup Inicial](#instalação-e-setup-inicial)
- [Configurando o Postman](#configurando-o-postman)
- [Testando os Endpoints](#testando-os-endpoints)
- [Coleção de Exemplos](#coleção-de-exemplos)
- [Troubleshooting](#troubleshooting)

---

## Instalação e Setup Inicial

### 1. Instalar Dependências

```bash
cd c:\Users\Thalik\Repos\cnc-builder-api
npm install
```

### 2. Iniciar o Servidor

```bash
npm run dev
```

Você deve ver a mensagem:
```
🚀 API rodando em http://localhost:3001
```

### 3. Verificar se está Funcionando

Abra o navegador em: `http://localhost:3001/health`

Você deve ver:
```json
{
  "status": "ok",
  "timestamp": "2025-11-18T..."
}
```

---

## Configurando o Postman

### 1. Baixar o Postman

Se ainda não tem: https://www.postman.com/downloads/

### 2. Criar uma Nova Coleção

1. Abra o Postman
2. Clique em **"Collections"** no menu lateral
3. Clique em **"Create Collection"**
4. Nomeie como: **"CNC Builder API"**

### 3. Configurar Variável de Ambiente (Opcional)

Para facilitar os testes, configure uma variável de ambiente:

1. Clique no ícone de **engrenagem** (Settings) no canto superior direito
2. Clique em **"Environments"**
3. Clique em **"Create Environment"**
4. Nome: **"CNC Builder Local"**
5. Adicione a variável:
   - **Variable**: `base_url`
   - **Initial Value**: `http://localhost:3001`
   - **Current Value**: `http://localhost:3001`
6. Clique em **"Save"**
7. Selecione o ambiente **"CNC Builder Local"** no dropdown superior direito

Agora você pode usar `{{base_url}}` nas requisições.

---

## Testando os Endpoints

### Teste 1: Health Check

Verifica se a API está rodando.

**Configuração:**
- **Method**: `GET`
- **URL**: `http://localhost:3001/health` ou `{{base_url}}/health`

**Clique em "Send"**

**Resposta Esperada (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2025-11-18T03:00:00.000Z"
}
```

---

### Teste 2: Gerar G-code Básico (1 Peça)

Gera G-code para uma peça simples usando todas as configurações padrão.

**Configuração:**
- **Method**: `POST`
- **URL**: `http://localhost:3001/api/gcode/generate` ou `{{base_url}}/api/gcode/generate`
- **Headers**:
  - Key: `Content-Type`
  - Value: `application/json`
- **Body** (selecione "raw" e "JSON"):

```json
{
  "pecas": [
    {
      "largura": 100,
      "altura": 200,
      "tipoCorte": "externo",
      "id": "1",
      "nome": "Peça Teste"
    }
  ]
}
```

**Clique em "Send"**

**Resposta Esperada (200 OK):**
```json
{
  "gcode": "G21\nG90\nG17\n...",
  "metadata": {
    "linhas": 150,
    "tamanhoBytes": 4500,
    "tempoEstimado": {
      "tempoCorte": 45.5,
      "tempoMergulho": 12.3,
      "tempoPosicionamento": 8.2,
      "tempoTotal": 66.0,
      "distanciaCorte": 1200,
      "distanciaMergulho": 30,
      "distanciaPosicionamento": 150,
      "distanciaTotal": 1380
    },
    "metricas": {
      "areaUtilizada": 20000,
      "eficiencia": 0.46,
      "tempo": 5.2
    },
    "configuracoes": {
      "chapa": {
        "largura": 2850,
        "altura": 1500,
        "espessura": 15
      },
      "corte": {
        "profundidade": 15,
        "espacamento": 50,
        "profundidadePorPassada": 4,
        "feedrate": 1500,
        "plungeRate": 500,
        "rapidsSpeed": 4000,
        "spindleSpeed": 18000,
        "usarRampa": false,
        "anguloRampa": 3,
        "aplicarRampaEm": "primeira-passada",
        "usarMesmoEspacamentoBorda": true,
        "margemBorda": 50
      },
      "ferramenta": null,
      "nesting": {
        "metodo": "guillotine",
        "pecasPosicionadas": 1,
        "eficiencia": 0.46
      }
    }
  }
}
```

---

### Teste 3: Múltiplas Peças

Testa o nesting com várias peças.

**Body:**
```json
{
  "pecas": [
    {
      "largura": 100,
      "altura": 200,
      "tipoCorte": "externo",
      "id": "1",
      "nome": "Lateral Esquerda"
    },
    {
      "largura": 100,
      "altura": 200,
      "tipoCorte": "externo",
      "id": "2",
      "nome": "Lateral Direita"
    },
    {
      "largura": 300,
      "altura": 150,
      "tipoCorte": "externo",
      "id": "3",
      "nome": "Topo"
    },
    {
      "largura": 300,
      "altura": 150,
      "tipoCorte": "externo",
      "id": "4",
      "nome": "Base"
    }
  ]
}
```

**Resposta:** Veja a eficiência do nesting em `metadata.nesting.eficiencia`

---

### Teste 4: Configurações Customizadas

Testa com chapa menor e espaçamento diferente.

**Body:**
```json
{
  "pecas": [
    {
      "largura": 100,
      "altura": 200,
      "tipoCorte": "externo",
      "id": "1"
    }
  ],
  "configChapa": {
    "largura": 1000,
    "altura": 1000,
    "espessura": 10
  },
  "configCorte": {
    "profundidade": 10,
    "espacamento": 30,
    "profundidadePorPassada": 3,
    "feedrate": 1200,
    "plungeRate": 400
  }
}
```

---

### Teste 5: Algoritmo de Nesting Diferente

Testa com algoritmo "shelf" ao invés de "guillotine".

**Body:**
```json
{
  "pecas": [
    {
      "largura": 100,
      "altura": 200,
      "tipoCorte": "externo",
      "id": "1"
    },
    {
      "largura": 150,
      "altura": 150,
      "tipoCorte": "externo",
      "id": "2"
    }
  ],
  "metodoNesting": "shelf"
}
```

**Métodos disponíveis:**
- `greedy` - First-Fit Decreasing
- `shelf` - Shelf algorithm
- `guillotine` - Guillotine (padrão)

---

### Teste 6: Com Compensação de Ferramenta

Testa com compensação de ferramenta ativada.

**Body:**
```json
{
  "pecas": [
    {
      "largura": 100,
      "altura": 200,
      "tipoCorte": "externo",
      "id": "1"
    }
  ],
  "configFerramenta": {
    "diametro": 6,
    "numeroFerramenta": 1
  }
}
```

**Resultado:** O G-code incluirá comandos `G41`/`G42` para compensação.

---

### Teste 7: Sem Comentários no G-code

Gera G-code mais compacto sem comentários.

**Body:**
```json
{
  "pecas": [
    {
      "largura": 100,
      "altura": 200,
      "tipoCorte": "externo",
      "id": "1"
    }
  ],
  "incluirComentarios": false
}
```

---

### Teste 8: Peça com Corte Interno

Testa corte interno (furos, janelas).

**Body:**
```json
{
  "pecas": [
    {
      "largura": 300,
      "altura": 200,
      "tipoCorte": "interno",
      "id": "1",
      "nome": "Painel com Furo"
    }
  ]
}
```

---

### Teste 9: Peça Ignorada (Reserva Espaço)

Testa peça que reserva espaço mas não gera corte.

**Body:**
```json
{
  "pecas": [
    {
      "largura": 100,
      "altura": 200,
      "tipoCorte": "externo",
      "id": "1",
      "nome": "Peça Normal"
    },
    {
      "largura": 100,
      "altura": 200,
      "tipoCorte": "externo",
      "id": "2",
      "nome": "Espaço Reservado",
      "ignorada": true
    }
  ]
}
```

**Resultado:** A peça 2 não terá G-code gerado, mas ocupará espaço na chapa.

---

### Teste 10: Erro - Peça Não Cabe

Testa resposta de erro quando peça é maior que a chapa.

**Body:**
```json
{
  "pecas": [
    {
      "largura": 3000,
      "altura": 2000,
      "tipoCorte": "externo",
      "id": "1",
      "nome": "Peça Muito Grande"
    }
  ]
}
```

**Resposta Esperada (400 Bad Request):**
```json
{
  "error": "Algumas peças não couberam na chapa",
  "naoCouberam": [
    {
      "id": "1",
      "nome": "Peça Muito Grande",
      "largura": 3000,
      "altura": 2000
    }
  ]
}
```

---

### Teste 11: Erro - Array Vazio

Testa validação de array vazio.

**Body:**
```json
{
  "pecas": []
}
```

**Resposta Esperada (400 Bad Request):**
```json
{
  "error": "Parâmetro 'pecas' é obrigatório e deve ser array não vazio"
}
```

---

### Teste 12: Com Rampa (Ramp Entry)

Testa entrada em rampa para o corte.

**Body:**
```json
{
  "pecas": [
    {
      "largura": 100,
      "altura": 200,
      "tipoCorte": "externo",
      "id": "1"
    }
  ],
  "configCorte": {
    "usarRampa": true,
    "anguloRampa": 5,
    "aplicarRampaEm": "todas-passadas"
  }
}
```

**Opções para `aplicarRampaEm`:**
- `primeira-passada` (padrão)
- `todas-passadas`

---

## Coleção de Exemplos

### Importar Coleção Pronta

Você pode criar uma coleção Postman com todos os testes acima:

1. No Postman, clique em **"Import"**
2. Selecione **"Raw text"**
3. Cole o JSON abaixo
4. Clique em **"Import"**

```json
{
  "info": {
    "name": "CNC Builder API - Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{base_url}}/health",
          "host": ["{{base_url}}"],
          "path": ["health"]
        }
      }
    },
    {
      "name": "Generate G-code - Basic",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"pecas\": [\n    {\n      \"largura\": 100,\n      \"altura\": 200,\n      \"tipoCorte\": \"externo\",\n      \"id\": \"1\",\n      \"nome\": \"Peça Teste\"\n    }\n  ]\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/gcode/generate",
          "host": ["{{base_url}}"],
          "path": ["api", "gcode", "generate"]
        }
      }
    },
    {
      "name": "Generate G-code - Multiple Pieces",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"pecas\": [\n    {\n      \"largura\": 100,\n      \"altura\": 200,\n      \"tipoCorte\": \"externo\",\n      \"id\": \"1\",\n      \"nome\": \"Lateral Esquerda\"\n    },\n    {\n      \"largura\": 100,\n      \"altura\": 200,\n      \"tipoCorte\": \"externo\",\n      \"id\": \"2\",\n      \"nome\": \"Lateral Direita\"\n    },\n    {\n      \"largura\": 300,\n      \"altura\": 150,\n      \"tipoCorte\": \"externo\",\n      \"id\": \"3\",\n      \"nome\": \"Topo\"\n    },\n    {\n      \"largura\": 300,\n      \"altura\": 150,\n      \"tipoCorte\": \"externo\",\n      \"id\": \"4\",\n      \"nome\": \"Base\"\n    }\n  ]\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/gcode/generate",
          "host": ["{{base_url}}"],
          "path": ["api", "gcode", "generate"]
        }
      }
    },
    {
      "name": "Generate G-code - Custom Config",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"pecas\": [\n    {\n      \"largura\": 100,\n      \"altura\": 200,\n      \"tipoCorte\": \"externo\",\n      \"id\": \"1\"\n    }\n  ],\n  \"configChapa\": {\n    \"largura\": 1000,\n    \"altura\": 1000,\n    \"espessura\": 10\n  },\n  \"configCorte\": {\n    \"profundidade\": 10,\n    \"espacamento\": 30,\n    \"profundidadePorPassada\": 3,\n    \"feedrate\": 1200,\n    \"plungeRate\": 400\n  }\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/gcode/generate",
          "host": ["{{base_url}}"],
          "path": ["api", "gcode", "generate"]
        }
      }
    },
    {
      "name": "Generate G-code - Shelf Algorithm",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"pecas\": [\n    {\n      \"largura\": 100,\n      \"altura\": 200,\n      \"tipoCorte\": \"externo\",\n      \"id\": \"1\"\n    },\n    {\n      \"largura\": 150,\n      \"altura\": 150,\n      \"tipoCorte\": \"externo\",\n      \"id\": \"2\"\n    }\n  ],\n  \"metodoNesting\": \"shelf\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/gcode/generate",
          "host": ["{{base_url}}"],
          "path": ["api", "gcode", "generate"]
        }
      }
    },
    {
      "name": "Generate G-code - With Tool Compensation",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"pecas\": [\n    {\n      \"largura\": 100,\n      \"altura\": 200,\n      \"tipoCorte\": \"externo\",\n      \"id\": \"1\"\n    }\n  ],\n  \"configFerramenta\": {\n    \"diametro\": 6,\n    \"numeroFerramenta\": 1\n  }\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/gcode/generate",
          "host": ["{{base_url}}"],
          "path": ["api", "gcode", "generate"]
        }
      }
    },
    {
      "name": "Generate G-code - No Comments",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"pecas\": [\n    {\n      \"largura\": 100,\n      \"altura\": 200,\n      \"tipoCorte\": \"externo\",\n      \"id\": \"1\"\n    }\n  ],\n  \"incluirComentarios\": false\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/gcode/generate",
          "host": ["{{base_url}}"],
          "path": ["api", "gcode", "generate"]
        }
      }
    },
    {
      "name": "Generate G-code - Internal Cut",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"pecas\": [\n    {\n      \"largura\": 300,\n      \"altura\": 200,\n      \"tipoCorte\": \"interno\",\n      \"id\": \"1\",\n      \"nome\": \"Painel com Furo\"\n    }\n  ]\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/gcode/generate",
          "host": ["{{base_url}}"],
          "path": ["api", "gcode", "generate"]
        }
      }
    },
    {
      "name": "Error - Piece Too Large",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"pecas\": [\n    {\n      \"largura\": 3000,\n      \"altura\": 2000,\n      \"tipoCorte\": \"externo\",\n      \"id\": \"1\",\n      \"nome\": \"Peça Muito Grande\"\n    }\n  ]\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/gcode/generate",
          "host": ["{{base_url}}"],
          "path": ["api", "gcode", "generate"]
        }
      }
    },
    {
      "name": "Error - Empty Array",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"pecas\": []\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/gcode/generate",
          "host": ["{{base_url}}"],
          "path": ["api", "gcode", "generate"]
        }
      }
    }
  ]
}
```

---

## Troubleshooting

### Erro: "Could not get any response"

**Problema:** O servidor não está rodando.

**Solução:**
```bash
npm run dev
```

Verifique se aparece: `🚀 API rodando em http://localhost:3001`

---

### Erro: "EADDRINUSE: address already in use"

**Problema:** Porta 3001 já está sendo usada.

**Solução 1 - Parar o processo:**
```powershell
# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process
```

**Solução 2 - Usar outra porta:**
```bash
$env:PORT=3002; npm run dev
```

Depois ajuste a `base_url` no Postman.

---

### Erro 400: "Parâmetro 'pecas' é obrigatório"

**Problema:** Esqueceu de enviar o array `pecas` ou enviou vazio.

**Solução:** Certifique-se que o Body contém:
```json
{
  "pecas": [
    { "largura": 100, "altura": 200, "tipoCorte": "externo", "id": "1" }
  ]
}
```

---

### Erro 400: "Algumas peças não couberam na chapa"

**Problema:** Peças são maiores que a chapa (2850x1500 por padrão).

**Solução:** Reduza o tamanho das peças ou aumente a chapa:
```json
{
  "pecas": [...],
  "configChapa": {
    "largura": 3000,
    "altura": 2000
  }
}
```

---

### Resposta está truncada no Postman

**Problema:** O G-code é muito grande e o Postman trunca a resposta.

**Solução:**
1. Clique nos 3 pontinhos (...) na aba Response
2. Clique em **"Settings"**
3. Aumente **"Max response size"** para 10 MB

---

### Headers não estão sendo enviados

**Problema:** Esqueceu de adicionar `Content-Type: application/json`.

**Solução:**
1. Vá na aba **"Headers"**
2. Adicione:
   - Key: `Content-Type`
   - Value: `application/json`

Ou marque o checkbox **"Content-Type"** se já estiver lá mas desabilitado.

---

## Próximos Passos

Depois de testar no Postman:

1. ✅ Todos os testes passaram? Veja [API_DOCS.md](./API_DOCS.md) para referência completa
2. 🔧 Quer customizar? Veja [MIGRACAO_API.md](./MIGRACAO_API.md) para roadmap de features
3. 💻 Integrar com frontend? Veja exemplos JavaScript/TypeScript em [API_DOCS.md](./API_DOCS.md#javascript-fetch-example)

---

## Recursos Adicionais

- **Documentação Completa da API**: [API_DOCS.md](./API_DOCS.md)
- **Guia de Setup**: [README.md](./README.md)
- **Roadmap do Projeto**: [MIGRACAO_API.md](./MIGRACAO_API.md)

---

## Dicas do Postman

### Salvar Respostas

Para salvar respostas de G-code grandes:
1. Clique em **"Save Response"** abaixo da resposta
2. Escolha **"Save to a file"**
3. Salve como `.nc` ou `.gcode`

### Tests Automáticos

Adicione testes automáticos na aba **"Tests"**:

```javascript
// Verifica status 200
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Verifica se gcode foi gerado
pm.test("G-code was generated", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.gcode).to.exist;
    pm.expect(jsonData.gcode.length).to.be.above(0);
});

// Verifica metadata
pm.test("Metadata exists", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.metadata).to.exist;
    pm.expect(jsonData.metadata.tempoEstimado).to.exist;
});
```

### Variáveis Dinâmicas

Use variáveis para testar com dados aleatórios:

```json
{
  "pecas": [
    {
      "largura": {{$randomInt}},
      "altura": {{$randomInt}},
      "tipoCorte": "externo",
      "id": "{{$guid}}"
    }
  ]
}
```

---

**Precisa de ajuda?** Abra uma issue no [GitHub](https://github.com/Thalikbussacro/cnc-builder-api/issues).
