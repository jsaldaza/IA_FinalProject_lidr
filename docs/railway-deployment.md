# 🚀 GUÍA: Deploy Backend en Railway

## 📋 Paso a Paso

### 1️⃣ Crear Cuenta en Railway
1. Ve a: https://railway.app
2. Clic "Login" → "Login with GitHub"
3. Autoriza Railway para acceder a tus repos
4. Verifica tu email si es necesario

### 2️⃣ Conectar tu Repositorio
1. En Railway dashboard, clic "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Busca y selecciona "testforge-ai" (tu repo)
4. Clic "Deploy Now"

### 3️⃣ Configurar Service del Backend
1. Railway detectará automáticamente el monorepo
2. Clic en el service creado
3. Ve a "Settings" → "Environment"
4. **Cambia Root Directory**: `Saldazia-backend`
5. **Configura Build Command**: `npm run build`
6. **Configura Start Command**: `npm start`

### 4️⃣ Configurar Variables de Entorno
En "Variables" tab, añade:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=mongodb+srv://testforge:password@testforge-cluster.xxxxx.mongodb.net/testforge
JWT_SECRET=tu-jwt-secret-de-32-caracteres
OPENAI_API_KEY=sk-tu-openai-api-key
OPENAI_MODEL=gpt-4o-mini
CORS_ORIGIN=https://tu-frontend.vercel.app
```

### 5️⃣ Deploy y Verificación
1. Railway iniciará el deploy automáticamente
2. Ve a "Deployments" para ver el progreso
3. Una vez completado, verás la URL pública
4. Prueba: `https://tu-app.railway.app/health`

### 6️⃣ Configurar Custom Domain (Opcional)
1. Ve a "Settings" → "Domains"
2. Genera un subdominio: `testforge-api.railway.app`
3. O conecta tu propio dominio

## ✅ Verificación Final
- ✅ Backend responde en `/health`
- ✅ Database conecta correctamente `/db-test`
- ✅ API docs disponibles en `/api-docs`
- ✅ CORS configurado para frontend

## 🔧 Comandos Útiles

### Logs en tiempo real:
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Ver logs
railway logs
```

### Re-deploy manual:
```bash
railway up
```

## 💡 Consejos
- **500 horas gratis/mes** en tier gratuito
- **Auto-scaling** basado en tráfico
- **SSL automático** incluido
- **Variables de entorno** seguras
- **GitHub integration** para auto-deploy