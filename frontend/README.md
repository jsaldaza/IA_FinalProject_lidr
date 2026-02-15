# TestForge Frontend

Este es el frontend de la plataforma TestForge, desarrollado en React + TypeScript + Vite.

## Instalación
```bash
npm install
```

## Ejecución
```bash
npm run dev
```
## Variables de entorno
Copia `.env.example` a `.env` y define la URL de la API:
```bash
cp .env.example .env
```
Ejemplo mínimo:
```
VITE_API_URL=http://localhost:3000/api
```

## Conexión con Backend
Backend esperado en `http://localhost:3000/api` (ajusta `VITE_API_URL` si cambias el puerto).

## Scripts útiles
- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build para producción
- `npm run lint` - ESLint
- `npm run test:run` - Vitest en modo run

## Licencia
ISC
