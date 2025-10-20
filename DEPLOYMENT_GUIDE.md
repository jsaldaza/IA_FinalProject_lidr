# 🔐 CONFIGURACIÓN DE GITHUB SECRETS Y DEPLOYMENT
# ===============================================

Este documento te guía paso a paso para configurar GitHub Secrets y deployment automático.

## 📋 GITHUB SECRETS REQUERIDOS

### 🔧 Backend/Database Secrets
```
DATABASE_URL
├── Tu string de conexión MongoDB Atlas
├── Formato: mongodb+srv://usuario:password@cluster.mongodb.net/testforge
└── Obtén desde: MongoDB Atlas → Connect → Connect your application

JWT_SECRET  
├── Clave secreta para JWT (mínimo 32 caracteres)
├── Genera con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
└── Ejemplo: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

OPENAI_API_KEY
├── Tu API key de OpenAI
├── Obtén desde: https://platform.openai.com/api-keys
└── Formato: sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

### 🚀 Deployment Secrets (Railway Backend)
```
RAILWAY_TOKEN
├── Token de autenticación Railway
├── Obtén desde: Railway → Account Settings → Tokens
└── Usado para deploy automático del backend

DATABASE_URL_TEST
├── Base de datos para tests (puede ser la misma que DATABASE_URL)
└── Solo se usa durante CI/CD para tests
```

### 🌐 Frontend Secrets (Vercel)
```
VERCEL_TOKEN
├── Token de Vercel para deployment
├── Obtén desde: Vercel → Settings → Tokens
└── Usado para deploy automático del frontend

VERCEL_ORG_ID
├── ID de tu organización Vercel
├── Obtén desde: Vercel → Settings → General
└── También visible en .vercel/project.json después del primer deploy

VERCEL_PROJECT_ID  
├── ID del proyecto Vercel
├── Se crea automáticamente al vincular el repo
└── Visible en .vercel/project.json

VITE_API_URL_PROD
├── URL del backend en producción
├── Se obtiene después del deploy a Railway
└── Formato: https://tu-app.railway.app/api
```

### 🩺 Monitoring Secrets
```
BACKEND_URL
├── URL completa del backend en producción
├── Sin /api al final
└── Ejemplo: https://tu-app.railway.app

FRONTEND_URL
├── URL completa del frontend en producción  
└── Ejemplo: https://tu-app.vercel.app
```

## 🚀 GUÍA PASO A PASO DE DEPLOYMENT

### 1️⃣ Preparar MongoDB Atlas

```bash
# 1. Ve a MongoDB Atlas (https://cloud.mongodb.com)
# 2. Crea un cluster gratuito si no tienes uno
# 3. Ve a Database → Connect → Connect your application
# 4. Copia la connection string
# 5. Reemplaza <password> con tu contraseña real
```

### 2️⃣ Configurar Railway (Backend)

```bash
# 1. Ve a Railway.app y conecta con GitHub
# 2. Crea nuevo proyecto desde GitHub repo
# 3. Selecciona la carpeta Saldazia-backend
# 4. Configura variables de entorno:
#    - DATABASE_URL
#    - JWT_SECRET  
#    - OPENAI_API_KEY
#    - NODE_ENV=production
# 5. Railway detectará automáticamente el Dockerfile
# 6. El deploy se ejecutará automáticamente
```

### 3️⃣ Configurar Vercel (Frontend)

```bash
# 1. Ve a Vercel.com y conecta con GitHub
# 2. Importa tu repositorio
# 3. Configura:
#    - Framework Preset: Vite
#    - Root Directory: Saldazia-frontend  
#    - Build Command: npm run build
#    - Output Directory: dist
# 4. Configura variables de entorno:
#    - VITE_API_URL=https://tu-backend.railway.app/api
# 5. Deploy automático
```

### 4️⃣ Configurar GitHub Secrets

```bash
# Ve a tu repo → Settings → Secrets and variables → Actions
# Agrega todos los secrets listados arriba
```

### 5️⃣ Activar GitHub Actions

```bash
# Los workflows se activarán automáticamente en:
# - Push a main (deploy completo)  
# - Pull request (solo tests)
# - Schedule (health checks)
```

## 🛠️ COMANDOS ÚTILES

### Generar JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Verificar URLs de producción
```bash
# Backend health
curl https://tu-backend.railway.app/health

# Frontend 
curl https://tu-frontend.vercel.app/health

# Database test
curl https://tu-backend.railway.app/db-test
```

### Deploy manual (emergencia)
```bash
# Backend
railway login
railway link
railway up

# Frontend  
vercel --prod
```

## 🔧 CONFIGURACIÓN ALTERNATIVA (100% GRATUITA)

Si prefieres una alternativa completamente gratuita:

### Opción A: Render + Vercel
- **Backend**: Render.com (750 horas gratis/mes)
- **Frontend**: Vercel (ilimitado para proyectos personales)

### Opción B: Railway + Netlify  
- **Backend**: Railway (500 horas gratis/mes)
- **Frontend**: Netlify (100GB bandwidth gratis)

### Opción C: Todo en Vercel
- **Fullstack**: Vercel con API routes (limitado pero funcional)

## ⚠️ CONSEJOS DE SEGURIDAD

1. **Nunca commitees secrets** al repositorio
2. **Usa diferentes secrets** para development/production  
3. **Rota tus API keys** regularmente
4. **Monitorea el uso** de OpenAI API para evitar costos inesperados
5. **Configura alerts** en Railway/Vercel para uso excesivo

## 🆘 TROUBLESHOOTING

### Error: "Invalid DATABASE_URL"
```bash
# Verifica que la URL tenga el formato correcto
# mongodb+srv://username:password@cluster.mongodb.net/dbname
# Asegúrate de que la contraseña esté URL-encoded
```

### Error: "Railway deployment failed"
```bash
# Verifica que todas las variables de entorno estén configuradas
# Revisa los logs en Railway dashboard
# Verifica que el Dockerfile esté en la raíz de Saldazia-backend
```

### Error: "Vercel build failed"
```bash
# Verifica VITE_API_URL en variables de entorno Vercel
# Asegúrate de que el directorio raíz sea Saldazia-frontend
# Revisa que npm run build funcione localmente
```

## 📞 CONTACTO Y SOPORTE

Si encuentras problemas:
1. Revisa los logs en Railway/Vercel dashboards
2. Verifica GitHub Actions en la pestaña Actions
3. Consulta la documentación oficial de cada servicio
4. Los health checks automáticos te alertarán de problemas