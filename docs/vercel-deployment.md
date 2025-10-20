# 🌐 GUÍA: Deploy Frontend en Vercel

## 📋 Paso a Paso

### 1️⃣ Crear Cuenta en Vercel
1. Ve a: https://vercel.com
2. Clic "Sign Up" → "Continue with GitHub"
3. Autoriza Vercel para acceder a tus repos
4. Completa tu perfil

### 2️⃣ Importar tu Repositorio
1. En Vercel dashboard, clic "Add New..." → "Project"
2. Busca y selecciona "testforge-ai" (tu repo)
3. Clic "Import"

### 3️⃣ Configurar el Proyecto
En la pantalla de configuración:

**Framework Preset**: Vite
**Root Directory**: `Saldazia-frontend`
**Build Command**: `npm run build`
**Output Directory**: `dist`
**Install Command**: `npm install`

### 4️⃣ Configurar Variables de Entorno
En "Environment Variables", añade:

```env
VITE_API_URL=https://tu-backend.railway.app/api
VITE_APP_TITLE=TestForge AI
VITE_APP_DESCRIPTION=AI-Powered Testing Platform
```

**⚠️ IMPORTANTE**: Reemplaza `tu-backend.railway.app` con la URL real de Railway

### 5️⃣ Deploy
1. Clic "Deploy"
2. Vercel construirá y desplegará automáticamente
3. En 2-3 minutos tendrás tu URL: `https://testforge-ai.vercel.app`

### 6️⃣ Configurar Dominio Personalizado (Opcional)
1. Ve a Project Settings → Domains
2. Añade tu dominio personalizado
3. Configura DNS según las instrucciones

### 7️⃣ Configurar Auto-Deploy
1. Ve a Project Settings → Git
2. Verifica que "Auto-deploy" esté habilitado
3. Cada push a `main` desplegará automáticamente

## ✅ Verificación Final
- ✅ Frontend carga correctamente
- ✅ Se conecta al backend en Railway
- ✅ Autenticación funciona
- ✅ Dashboard muestra datos

## 🔧 Comandos Útiles

### Deploy desde CLI:
```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Ver logs:
```bash
vercel logs https://tu-app.vercel.app
```

### Rollback a versión anterior:
```bash
vercel rollback
```

## 🌐 URLs Importantes

Después del deploy tendrás:
- **Producción**: https://testforge-ai.vercel.app
- **Preview**: URLs automáticas para cada PR
- **Analytics**: Métricas de performance integradas

## 💡 Consejos
- **Unlimited bandwidth** para proyectos personales
- **Global CDN** para performance mundial
- **Automatic HTTPS** incluido
- **Preview deployments** para cada PR
- **Analytics** y monitoring incluidos

## 🔄 Workflow Completo
```
GitHub Push → Vercel Build → Deploy → Live URL
     ↓
  Preview URL para PRs
```