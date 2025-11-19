# Deploy no Render.com - Guia Passo a Passo

## 📋 Pré-requisitos

- Conta no GitHub (já tem ✅)
- Repositório `cnc-builder-api` no GitHub (já tem ✅)
- Conta no Render.com (gratuita)

---

## 🚀 Passo a Passo

### 1. Criar Conta no Render

1. Acesse: https://render.com/
2. Clique em **Get Started for Free**
3. Escolha **Sign up with GitHub**
4. Autorize o Render a acessar seus repositórios

### 2. Criar Novo Web Service

1. No dashboard do Render, clique em **New +**
2. Selecione **Web Service**
3. Clique em **Connect a repository**
4. Encontre e selecione: `Thalikbussacro/cnc-builder-api`
5. Clique em **Connect**

### 3. Configurar o Serviço

Preencha os campos:

**Name:**
```
cnc-builder-api
```

**Region:**
```
Oregon (US West) - ou escolha o mais próximo
```

**Branch:**
```
main
```

**Root Directory:**
```
(deixe em branco)
```

**Environment:**
```
Node
```

**Build Command:**
```
npm install && npm run build
```

**Start Command:**
```
npm start
```

**Instance Type:**
```
Free (starter instance)
```

### 4. Configurar Variáveis de Ambiente

Role para baixo até **Environment Variables** e adicione:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render usa porta 10000 por padrão) |
| `ALLOWED_ORIGINS` | `https://seu-app.vercel.app,http://localhost:3000` |

### 5. Health Check (Opcional mas recomendado)

Em **Advanced**, adicione:

**Health Check Path:**
```
/health
```

### 6. Deploy

1. Clique em **Create Web Service**
2. Aguarde o deploy (leva ~2-5 minutos)
3. Você verá os logs em tempo real

### 7. Obter URL da API

Após o deploy, sua API estará disponível em:
```
https://cnc-builder-api.onrender.com
```

Teste o health check:
```bash
curl https://cnc-builder-api.onrender.com/health
```

Resposta esperada:
```json
{"status":"ok","timestamp":"..."}
```

---

## 🔧 Configuração no Frontend (Vercel)

Depois que a API estiver no ar, configure o frontend:

1. No Vercel, vá em **Settings → Environment Variables**
2. Adicione:
   - **Key:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://cnc-builder-api.onrender.com`
   - **Environments:** Production, Preview, Development

---

## ⚠️ Importante: Plano Free do Render

- **Limitações:**
  - O serviço "dorme" após 15 minutos de inatividade
  - Primeira requisição após dormir demora ~30 segundos (cold start)
  - 750 horas grátis por mês

- **Solução para Cold Start:**
  - Use um serviço de "ping" (ex: UptimeRobot, Cron-job.org)
  - Configure para fazer ping a cada 10 minutos em `/health`

---

## 📊 Monitoramento

**Ver Logs:**
1. Dashboard do Render → Seu serviço
2. Clique na aba **Logs**

**Métricas:**
- CPU, memória e requisições disponíveis na aba **Metrics**

---

## 🔄 Atualizações Automáticas

Sempre que você fizer push para a branch `main`:
1. Render detecta automaticamente
2. Faz rebuild e redeploy
3. Zero downtime (mantém versão antiga até nova estar pronta)

---

## 🐛 Troubleshooting

**Build falhou:**
- Verifique logs na aba **Logs**
- Certifique-se que `npm run build` funciona localmente

**Serviço não inicia:**
- Confirme que `PORT` está configurado (Render usa 10000)
- Verifique se `npm start` funciona após build local

**CORS errors:**
- Adicione a URL do Vercel em `ALLOWED_ORIGINS`
- Formato: `https://seu-app.vercel.app` (sem barra no final)

**Cold start muito lento:**
- Configure UptimeRobot para fazer ping a cada 10 min
- Ou faça upgrade para plano pago ($7/mês)

---

## ✅ Checklist Final

- [ ] API deployada com sucesso
- [ ] Health check retorna `{"status":"ok"}`
- [ ] Teste geração de G-code via Postman/curl
- [ ] URL da API copiada
- [ ] Frontend configurado com URL da API
- [ ] Teste end-to-end funcionando

---

## 📞 Links Úteis

- **Dashboard Render:** https://dashboard.render.com/
- **Documentação Render:** https://render.com/docs
- **Status do Serviço:** https://status.render.com/

---

## ⚠️ IMPORTANTE: Verificar Configuração Manual

Se o deploy continuar falhando com o erro de `/opt/render/project/src/dist/server.js`, faça o seguinte:

### Verificar Start Command no Dashboard

1. Acesse: https://dashboard.render.com/
2. Clique no seu serviço `cnc-builder-api`
3. Vá na aba **Settings**
4. Role até **Build & Deploy**
5. Verifique se **Start Command** está como: `npm start`
6. Se estiver como `node dist/server.js`, **MUDE PARA**: `npm start`
7. Clique em **Save Changes**
8. Faça **Manual Deploy** clicando em **Deploy latest commit**

### Por Que Isso Acontece?

O Render pode ter "cachado" a configuração antiga antes do `render.yaml` ser adicionado. O arquivo `render.yaml` só é lido na **primeira vez** que você cria o serviço.

### Solução Alternativa: Recriar Serviço

Se a mudança manual não funcionar:

1. **Delete o serviço atual** no dashboard do Render
2. **Crie um novo serviço** conectando novamente ao GitHub
3. O Render vai ler o `render.yaml` automaticamente
4. Deploy deve funcionar imediatamente

---
