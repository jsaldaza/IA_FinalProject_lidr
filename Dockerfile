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

# DEBUGGING EXTREMO: Verificar QUÉ SE COPIÓ EXACTAMENTE
RUN echo "=== DEBUGGING EXTREMO - QUÉ SE COPIÓ ===" && \
    ls -la && \
    echo "=== BUSCANDO DIRECTORIOS BACKEND ===" && \
    find . -type d -name "*backend*" && \
    echo "=== ARCHIVOS EN ROOT ===" && \
    ls -1 | grep -i backend || echo "No hay archivos con 'backend'" && \
    echo "=== VERIFICANDO CON TREE (si está disponible) ===" && \
    (which tree && tree -L 2) || echo "tree no disponible" && \
    echo "=== CONTENIDO DE . (COMPLETO) ===" && \
    find . -maxdepth 2 -type d | head -20

# Entrar al directorio del backend con verificación robusta
RUN echo "=== INTENTANDO ACCEDER AL BACKEND ===" && \
    cd backend && \
    pwd && \
    echo "=== CONTENIDO DEL BACKEND ===" && \
    ls -la

WORKDIR /app/backend

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