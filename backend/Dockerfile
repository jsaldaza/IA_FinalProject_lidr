# 🐳 Dockerfile para Railway - Desde directorio backend
FROM node:20.19.0-slim

# Instalar dependencias del sistema
RUN apt-get update && \
    apt-get install -y python3 make g++ curl && \
    rm -rf /var/lib/apt/lists/*

# Configurar directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig*.json ./

# Instalar dependencias (usa install para resolver lock desincronizado en CI)
RUN npm install --no-fund --no-audit

# Copiar prisma y generar cliente
COPY prisma/ ./prisma/
RUN npx prisma generate

# Copiar código fuente
COPY src/ ./src/

# Compilar TypeScript
RUN npm run build

# Verificar build
RUN ls -la dist/ || echo "No dist directory found"

# Exponer puerto
EXPOSE $PORT

# Variables de entorno
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Comando de inicio
CMD ["npm", "start"]