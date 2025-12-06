# Processo de Reescrita de Mensagens de Commit

Este documento descreve o processo padronizado para reescrever mensagens de commit usando git-filter-repo.

## Requisitos

- Python 3.14+ instalado em: `C:\Users\Thalik\AppData\Local\Python\pythoncore-3.14-64\python.exe`
- git-filter-repo instalado em: `C:\Tools\git-filter-repo\git-filter-repo.py`

## Regras de Reescrita

### 1. Formato da Mensagem

**Estrutura:**
```
tipo: descricao curta sem acentos e em minusculas

Corpo opcional com detalhes técnicos objetivos (pode ter acentos).
```

**Tipos convencionais:**
- `feat`: nova funcionalidade
- `fix`: correção de bug
- `docs`: apenas documentação
- `refactor`: refatoração de código
- `perf`: melhoria de performance
- `test`: adição ou correção de testes
- `chore`: tarefas de manutenção
- `security`: melhorias de segurança
- `ci`: integração contínua

### 2. Regras de Limpeza

**SEMPRE remover:**
- ❌ Referências de estágio: `(#3.4)`, `(Estágio 10)`, etc.
- ❌ Indicadores de fase: `Fase 1 completa`, `#7.3`, etc.
- ❌ Linhas de autoria automática: `🤖 Generated with [Claude Code]`
- ❌ Linhas Co-Authored-By: `Co-Authored-By: Claude <noreply@anthropic.com>`
- ❌ TODOS os emojis em qualquer parte da mensagem
- ❌ Qualquer referência a ferramentas de IA

**SEMPRE manter:**
- ✅ Descrição técnica objetiva
- ✅ Detalhes de implementação relevantes
- ✅ Português claro e profissional
- ✅ Tom natural (não artificial)

### 3. Estilo de Escrita

**Tom:**
- Direto e técnico
- Sem exageros ou superlativos
- Natural, como escrito por desenvolvedor humano
- Sem metacomentários sobre IA

**Cabeçalho:**
- Máximo ~50 caracteres
- Imperativo: "adicionar" não "adicionado"
- **Apenas minúsculas** (incluindo após o tipo)
- **Sem acentos** - usar "adicao" ao invés de "adição"
- Sem ponto final

**Corpo:**
- Opcional, apenas quando necessário
- Linhas com máximo 72 caracteres
- Foco em "o que" e "por que", não "como"
- Listas com hífen ou asterisco quando apropriado

## Processo Passo a Passo

### Passo 1: Exportar Histórico Atual

```bash
cd c:\Users\Thalik\Repos\cnc-builder-web
git log feature/api-integration --format="%H%n%B%n===END===" > commits-export.txt
```

### Passo 2: Criar Mapeamento de Reescrita

Criar arquivo `commit-rewrite-map.py`:

```python
# -*- coding: utf-8 -*-
"""Mapeamento de mensagens de commit reescritas"""

COMMIT_MESSAGES = {
    'hash_do_commit': '''tipo: descricao curta sem acentos e minusculas

Corpo opcional com detalhes (pode ter acentos).''',

    # Adicionar todos os commits aqui
}
```

**Regras ao criar o mapeamento:**
1. Use hashes completos (40 caracteres)
2. Mensagens entre `'''` (aspas triplas)
3. Sem emojis, referências de estágio ou menções a IA
4. Português profissional e natural

### Passo 3: Criar Script de Execução

Criar arquivo `run-git-filter.py`:

```python
# -*- coding: utf-8 -*-
import subprocess
import sys

# Carregar mapeamento
mapping = {}
exec(open('commit-rewrite-map.py', encoding='utf-8').read(), mapping)
COMMIT_MESSAGES = mapping['COMMIT_MESSAGES']

print(f"\nReescrevendo {len(COMMIT_MESSAGES)} mensagens de commit...")
print("=" * 60)

# Criar callback como string
callback_lines = ['MESSAGES = {']
for hash_val, msg in COMMIT_MESSAGES.items():
    escaped_msg = msg.replace("'", "\\'")
    callback_lines.append(f"  '{hash_val}': '''{escaped_msg}''',")
callback_lines.append('}')
callback_lines.append('commit_hash = commit.original_id.decode("utf-8")')
callback_lines.append('if commit_hash in MESSAGES:')
callback_lines.append('    commit.message = MESSAGES[commit_hash].encode("utf-8")')

callback_code = '\n'.join(callback_lines)

# Executar git-filter-repo
cmd = [
    r'C:\Users\Thalik\AppData\Local\Python\pythoncore-3.14-64\python.exe',
    r'C:\Tools\git-filter-repo\git-filter-repo.py',
    '--force',
    '--refs', 'heads/feature/api-integration',  # Ajustar branch conforme necessário
    '--commit-callback', callback_code
]

result = subprocess.run(cmd, cwd=r'c:\Users\Thalik\Repos\cnc-builder-web',
                       capture_output=True, text=True, encoding='utf-8')

print(result.stdout)
if result.stderr:
    print(result.stderr)

if result.returncode == 0:
    print("=" * 60)
    print(f"Reescrita concluida com sucesso!")
    print(f"Total de commits processados: {len(COMMIT_MESSAGES)}")
else:
    print(f"\nErro (codigo {result.returncode})")
    sys.exit(1)
```

### Passo 4: Executar Reescrita

```bash
cd c:\Users\Thalik\Repos\cnc-builder-web
python run-git-filter.py
```

### Passo 5: Verificar Resultado

```bash
# Ver últimos 10 commits reescritos
git log feature/api-integration --oneline -10

# Ver mensagem completa de um commit
git show <hash> --format="%s%n%n%b" --no-patch

# Verificar se há referências indesejadas
git log feature/api-integration --format="%s%n%b" | grep -E "(#[0-9]\.|🤖|Claude|Fase [0-9])"
```

### Passo 6: Limpar Arquivos Temporários

```bash
rm -f commits-export.txt commit-rewrite-map.py run-git-filter.py commits-current.txt
```

### Passo 7: Enviar para o GitHub (Force Push)

**⚠️ IMPORTANTE:** Após reescrever o histórico, você **DEVE** fazer force push para atualizar o repositório remoto.

```bash
# 1. Verificar status (branches divergiram)
git status
# Você verá: "Your branch and 'origin/...' have diverged"

# 2. Adicionar arquivo de documentação (se criado)
git add PROCESSO-REESCRITA-COMMITS.md

# 3. Fazer commit da documentação
git commit -m "docs: adicionar documentação do processo de reescrita de commits"

# 4. Force push para o GitHub (--force-with-lease é mais seguro)
git push --force-with-lease origin feature/api-integration
```

**Por que force push é necessário:**
- A reescrita de mensagens muda os hashes dos commits
- O histórico local e remoto divergem (mesmos commits, hashes diferentes)
- `--force-with-lease` sobrescreve o remoto, mas verifica se ninguém fez push enquanto você trabalhava
- Se alguém fez push, o comando falha (proteção contra perder trabalho de outros)

**Alternativa mais agressiva (use com cuidado):**
```bash
# Apenas se --force-with-lease falhar e você TEM CERTEZA que pode sobrescrever
git push --force origin feature/api-integration
```

**Após o push, verificar no GitHub:**
1. Acesse a branch no GitHub
2. Verifique algumas mensagens de commit
3. Confirme que não há referências de estágio, fase ou IA

## Exemplo Completo

### Antes (Mensagem Original):
```
feat: add keyboard shortcuts for better UX (#3.4)

- Create useKeyboardShortcuts hook for global keyboard shortcuts
- Add Ctrl+Enter to generate G-code
- Add Ctrl+K to clear all pieces
- Add Escape to close modals (visualizer and validation dialog)
- Add visual hints (kbd tags) to buttons showing shortcuts
- Only show kbd hints on XL screens to avoid button crowding

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### Depois (Mensagem Reescrita):
```
feat: adicionar atalhos de teclado para melhor ux

Cria hook useKeyboardShortcuts para atalhos globais. Adiciona Ctrl+Enter
para gerar G-code, Ctrl+K para limpar todas as peças, Escape para fechar
modais. Adiciona hints visuais (tags kbd) nos botões mostrando atalhos,
visíveis apenas em telas XL.
```

## Checklist de Qualidade

Antes de executar a reescrita, verificar cada mensagem:

- [ ] Sem emojis em qualquer parte
- [ ] Sem referências de estágio (#X.X, Fase X, Estágio X)
- [ ] Sem linhas "Generated with" ou "Co-Authored-By"
- [ ] Sem menções a ferramentas de IA
- [ ] Português claro e profissional
- [ ] Tipo conventional commit correto
- [ ] Cabeçalho conciso (≤50 chars)
- [ ] **Cabeçalho sem acentos e apenas minúsculas**
- [ ] Corpo objetivo e relevante (pode ter acentos)
- [ ] Tom natural e técnico

## Notas Importantes

### ⚠️ IMPORTANTE: Datas dos Commits

O git-filter-repo **preserva automaticamente** as datas dos commits (author date e commit date). Você **não precisa** fazer nada especial para manter as datas originais.

### ⚠️ Hashes Serão Alterados

Quando você reescreve mensagens de commit, os **hashes mudam**. Isso é esperado e normal. Certifique-se de:
- Fazer backup antes de reescrever
- Avisar colaboradores se a branch for compartilhada
- Fazer force push se necessário: `git push --force-with-lease`

### ⚠️ Branch Isolada

Recomendado trabalhar em branch isolada primeiro:
```bash
git checkout -b rewrite-test feature/api-integration
# Executar reescrita
# Verificar resultado
# Se OK, aplicar na branch real
```

## Troubleshooting

### Erro: "ModuleNotFoundError: No module named 'commit_rewrite_map'"

**Causa:** Python não encontrou o arquivo de mapeamento.

**Solução:** Executar o script no mesmo diretório do `commit-rewrite-map.py`:
```bash
cd c:\Users\Thalik\Repos\cnc-builder-web
python run-git-filter.py
```

### Erro: "UnicodeEncodeError"

**Causa:** Caracteres especiais (emojis) no output do print.

**Solução:** Já está resolvido no script acima usando `encoding='utf-8'` e removendo emojis das mensagens de progresso.

### Alguns commits não foram reescritos

**Causa:** Hash do commit não está no mapeamento ou está incorreto.

**Solução:**
1. Verificar hash correto: `git log feature/api-integration --format="%H - %s"`
2. Garantir que hash está completo (40 caracteres)
3. Re-executar o script

---

**Documentação criada em:** 2025-12-05
**Última atualização:** 2025-12-05
