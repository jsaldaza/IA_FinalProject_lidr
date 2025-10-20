# 🐳 Dockerfile para Frontend React + Vite
FROM node:18-alpine AS builder

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat

# Configurar directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./

# Instalar dependencias
RUN npm ci && npm cache clean --force

# Copiar código fuente
COPY src ./src
COPY public ./public

# Build de producción
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# 🌐 Imagen de producción con nginx
FROM nginx:alpine AS production

# Copiar configuración personalizada de nginx
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Comprimir archivos
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate no_last_modified no_etag auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Caché para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }

    # SPA routing - todas las rutas van a index.html
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Copiar archivos construidos desde la imagen builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Crear usuario no-root
RUN adduser -D -s /bin/sh nginxuser
USER nginxuser

# Exponer puerto
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# nginx se inicia automáticamente