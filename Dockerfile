# 🐳 Dockerfile para Railway - No Cache Strategy
FROM node:18-slim

# Evitar cache de Docker en Railway
ARG BUILDKIT_INLINE_CACHE=0

# Instalar dependencias del sistema
RUN apt-get update && \
    apt-get install -y python3 make g++ curl && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Configurar directorio de trabajo
WORKDIR /app

# Copiar TODOS los archivos del backend de una vez
COPY Saldazia-backend/ ./

# Verificar que los archivos están presentes
RUN ls -la && \
    ls -la src/ && \
    ls -la prisma/

# Instalar dependencias
RUN npm ci --production=false

# Generar cliente Prisma
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Verificar que el build fue exitoso
RUN ls -la dist/

# Exponer el puerto que Railway va a usar
EXPOSE $PORT

# Variables de entorno
ENV NODE_ENV=production

# Health check simple
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Comando de inicio
CMD ["npm", "start"]