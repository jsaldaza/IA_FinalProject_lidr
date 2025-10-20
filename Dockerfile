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

# Verificar estructura con más detalle
RUN echo "=== ESTRUCTURA COMPLETA ===" && \
    ls -la && \
    echo "=== VERIFICANDO SALDAZIA-BACKEND EXISTE ===" && \
    find . -name "*Saldazia*" -type d && \
    echo "=== VERIFICANDO PERMISOS ===" && \
    ls -ld Saldazia-backend 2>/dev/null || echo "Directory access issue" && \
    echo "=== CONTENIDO DIRECTO ===" && \
    [ -d "Saldazia-backend" ] && echo "Directory exists" || echo "Directory missing"

# Entrar al directorio del backend con verificación robusta
RUN echo "=== INTENTANDO ACCEDER AL BACKEND ===" && \
    cd Saldazia-backend && \
    pwd && \
    echo "=== CONTENIDO DEL BACKEND ===" && \
    ls -la

WORKDIR /app/Saldazia-backend

# Verificar que estamos en el lugar correcto
RUN echo "=== VERIFICANDO CONTENIDO BACKEND FINAL ===" && \
    pwd && \
    ls -la && \
    echo "=== PACKAGE.JSON ===" && \
    test -f package.json && cat package.json | head -10 || echo "package.json not found"

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