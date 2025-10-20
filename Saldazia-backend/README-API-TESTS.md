# API Test Runner (TestForge backend)

Este script realiza llamadas a los endpoints principales y guarda las respuestas en `api-test-results/`.

Uso:

1. Desde `testforge-backend` inicia el servidor en modo desarrollo:

```cmd
npm run dev
```

2. En otra terminal ejecuta:

```cmd
npm run test:api
```

3. Los resultados se guardarán en `testforge-backend/api-test-results/`.

Variables opcionales de entorno:
- HOST (por defecto http://localhost:3000)
- TOKEN (si quieres usar un token existente)
- PROJECT_ID, ANALYSIS_ID (si ya los tienes)

Ejemplo:

```cmd
set HOST=http://localhost:3000
npm run test:api
```
