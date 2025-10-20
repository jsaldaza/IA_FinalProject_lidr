# 🐳 Dockerfile para Backend Node.js + TypeScript
FROM node:18-alpine AS builder

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat

# Configurar directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci --only=production && npm cache clean --force

# Generar cliente Prisma
RUN npx prisma generate

# Copiar código fuente
COPY src ./src

# Compilar TypeScript
RUN npm run build

# 🏗️ Imagen de producción
FROM node:18-alpine AS production

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 testforge

# Configurar directorio de trabajo
WORKDIR /app

# Copiar dependencias y build desde la imagen builder
COPY --from=builder --chown=testforge:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=testforge:nodejs /app/dist ./dist
COPY --from=builder --chown=testforge:nodejs /app/package*.json ./
COPY --from=builder --chown=testforge:nodejs /app/prisma ./prisma

# Cambiar al usuario no-root
USER testforge

# Exponer puerto
EXPOSE 3000

# Variables de entorno de producción
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Comando de inicio
CMD ["node", "dist/server.js"]