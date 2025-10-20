FROM node:18-slim# 🐳 Dockerfile FÁCIL para Railway# 🐳 Dockerfile simple para Railway - Contexto desde root# 🐳 Dockerfile ALTERNATIVO - Copia completa



RUN apt-get update && apt-get install -y python3 make g++ curl && rm -rf /var/lib/apt/lists/*FROM node:18-slim



WORKDIR /app/backendFROM node:18-slimFROM node:18-slim



COPY backend/package*.json ./# Instalar dependencias del sistema

COPY backend/tsconfig*.json ./

RUN apt-get update && \

    RUN npm ci --production=false

apt-get install -y python3 make g++ curl && \

    COPY backend/prisma ./prisma/

RUN npx prisma generate    rm -rf /var/lib/apt/lists/*# Instalar dependencias del sistema# Instalar dependencias del sistema



COPY backend/src ./src/



RUN npm run build# Configurar directorio de trabajo en backendRUN apt-get update && \RUN apt-get update && \



    RUN ls -la dist/ || echo "Build directory not found"WORKDIR /app/backend



EXPOSE $PORT    apt-get install -y python3 make g++ curl && \    apt-get install -y python3 make g++ curl && \



    ENV NODE_ENV=production# Copiar archivos del backend desde el contexto root



CMD ["npm", "start"]COPY backend/package*.json ./    rm -rf /var/lib/apt/lists/*    rm -rf /var/lib/apt/lists/*

COPY backend/tsconfig*.json ./



# Instalar dependencias

RUN npm ci --production=false# Configurar directorio de trabajo# Configurar directorio de trabajo



# Copiar prisma y generar clienteWORKDIR /appWORKDIR /app

COPY backend/prisma ./prisma/

RUN npx prisma generate



# Copiar código fuente# Cambiar al directorio backend (donde está todo el código)# STRATEGY: Copiar TODO y luego entrar al subdirectorio

COPY backend/src ./src/

WORKDIR /app/backendCOPY . ./

# Compilar TypeScript

RUN npm run build



# Verificar que el build fue exitoso# Copiar archivos de backend directamente# DEBUGGING EXTREMO: Verificar QUÉ SE COPIÓ EXACTAMENTE

RUN ls -la dist/ || echo "Build directory not found"

COPY backend/package*.json ./RUN echo "=== DEBUGGING EXTREMO - QUÉ SE COPIÓ ===" && \

    # Exponer puerto dinámico de Railway

    EXPOSE $PORTCOPY backend/tsconfig*.json ./    ls -la && \



    # Variables de entorno    echo "=== BUSCANDO DIRECTORIOS BACKEND ===" && \

    ENV NODE_ENV=production

# Instalar dependencias    find . -type d -name "*backend*" && \

# Comando de inicio

CMD ["npm", "start"]RUN npm ci --production=false    echo "=== ARCHIVOS EN ROOT ===" && \

    ls -1 | grep -i backend || echo "No hay archivos con 'backend'" && \

    # Copiar prisma y generar cliente    echo "=== VERIFICANDO CON TREE (si está disponible) ===" && \

    COPY backend/prisma ./prisma/    (which tree && tree -L 2) || echo "tree no disponible" && \

    RUN npx prisma generate    echo "=== CONTENIDO DE . (COMPLETO) ===" && \

    find . -maxdepth 2 -type d | head -20

# Copiar código fuente

COPY backend/src ./src/# Entrar al directorio del backend con verificación robusta

RUN echo "=== INTENTANDO ACCEDER AL BACKEND ===" && \

    # Compilar TypeScript    cd backend && \

    RUN npm run build    pwd && \

    echo "=== CONTENIDO DEL BACKEND ===" && \

    # Verificar build exitoso    ls -la

    RUN ls -la dist/

WORKDIR /app/backend

# Exponer puerto dinámico de Railway

EXPOSE $PORT# Verificar que estamos en el lugar correcto

RUN echo "=== VERIFICANDO CONTENIDO BACKEND FINAL ===" && \

    # Variables de entorno    pwd && \

    ENV NODE_ENV=production    ls -la && \

    echo "=== PACKAGE.JSON ===" && \

    # Health check simple    test -f package.json && cat package.json | head -10 || echo "package.json not found"

    HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \

    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1# Instalar dependencias

RUN npm ci --production=false

# Comando de inicio

CMD ["npm", "start"]# Generar cliente Prisma
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