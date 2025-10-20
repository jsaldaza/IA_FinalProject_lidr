# 🐳 Dockerfile simplificado para Railway
FROM node:18-slim

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Configurar directorio de trabajo
WORKDIR /app

# Copiar todo el backend
COPY Saldazia-backend/ ./

# Instalar dependencias
RUN npm install

# Generar Prisma client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Limpiar cache
RUN npm cache clean --force

# Exponer el puerto que Railway va a usar
EXPOSE $PORT

# Variables de entorno
ENV NODE_ENV=production

# Health check simple
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Comando de inicio
CMD ["npm", "start"]