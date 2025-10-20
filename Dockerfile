# 🐳 Dockerfile optimizado para Railway
FROM node:18-alpine

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache python3 make g++

# Configurar directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración primero desde el backend
COPY Saldazia-backend/package*.json ./
COPY Saldazia-backend/tsconfig*.json ./

# Instalar todas las dependencias (dev y production)
RUN npm ci

# Copiar prisma y generar cliente
COPY Saldazia-backend/prisma ./prisma/
RUN npx prisma generate

# Copiar código fuente del backend
COPY Saldazia-backend/src ./src

# Compilar TypeScript
RUN npm run build

# Limpiar dependencias dev después del build
RUN npm ci --only=production && npm cache clean --force

# Exponer el puerto que Railway va a usar
EXPOSE $PORT

# Variables de entorno
ENV NODE_ENV=production

# Health check simple
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Comando de inicio
CMD ["npm", "start"]