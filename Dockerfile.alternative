# 🐳 Dockerfile ALTERNATIVO - Copia completa
FROM node:18-slim

# Instalar dependencias del sistema
RUN apt-get update && \
    apt-get install -y python3 make g++ curl && \
    rm -rf /var/lib/apt/lists/*

# Configurar directorio de trabajo
WORKDIR /app

# STRATEGY: Copiar TODO y luego entrar al subdirectorio
COPY . ./

# Verificar estructura
RUN echo "=== ESTRUCTURA COMPLETA ===" && \
    ls -la && \
    echo "=== VERIFICANDO SALDAZIA-BACKEND ===" && \
    ls -la Saldazia-backend/

# Entrar al directorio del backend
WORKDIR /app/Saldazia-backend

# Verificar que estamos en el lugar correcto
RUN echo "=== VERIFICANDO CONTENIDO BACKEND ===" && \
    pwd && \
    ls -la && \
    echo "=== PACKAGE.JSON ===" && \
    cat package.json | head -10

# Instalar dependencias
RUN npm ci --production=false

# Generar cliente Prisma
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Verificar build
RUN ls -la dist/

# Exponer puerto
EXPOSE $PORT

# Variables de entorno
ENV NODE_ENV=production

# Comando de inicio
CMD ["npm", "start"]