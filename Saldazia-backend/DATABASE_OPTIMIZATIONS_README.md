# 🚀 Optimizaciones de Base de Datos - Guía de Implementación

## 📋 Resumen de Optimizaciones Implementadas

### ✅ **Fase 1: Limpieza de Base de Datos** (Completada)

- **Eliminación de tablas legacy**: `TestSuite`, `TestScenario`, `DomainEvent`
- **Eliminación de campos legacy**: `TestCase.analysisId`
- **Optimización de índices**: Nuevos índices compuestos para consultas frecuentes
- **Mejora de integridad**: Campo `conversationalAnalysisId` ahora NOT NULL

### ✅ **Fase 2: Redis Caching** (Completada)

- **Cliente Redis configurado** con manejo de errores y reconexión automática
- **Cache inteligente** para dashboard y datos frecuentes
- **Invalidación automática** de cache cuando cambian los datos
- **Health checks** integrados en endpoints de salud

### ✅ **Fase 3: Optimización de Consultas** (Completada)

- **Eliminación de N+1 queries** en servicios conversacionales
- **Eager loading inteligente** con límites de mensajes por análisis
- **Cálculo de cobertura optimizado** usando SQL en lugar de procesamiento en memoria
- **Paginación automática** en consultas de usuario
- **Consultas paralelas** para estadísticas múltiples

---

## 🛠️ **Cómo Ejecutar las Optimizaciones**

### **Opción 1: Ejecutar Migración de Limpieza (Recomendado)**

#### Windows (Batch)

```cmd
# Desde el directorio del backend
scripts\run-database-cleanup.bat
```

#### Linux/Mac o Node.js

```bash
# Desde el directorio del backend
node scripts/run-database-cleanup.js
```

### **Opción 2: Ejecutar Manualmente**

```bash
# 1. Ejecutar la migración
npx prisma migrate deploy

# 2. Generar cliente actualizado
npx prisma generate

# 3. Verificar que todo funciona
npm run build
```

---

## 🧪 **Probar las Optimizaciones**

### **Probar Redis Cache**

```bash
# Ejecutar pruebas de Redis
npx ts-node scripts/test-redis-cache.ts
```

### **Verificar Health Checks**

```bash
# Health check general
curl http://localhost:3000/health

# Health check detallado
curl http://localhost:3000/health/detailed

# Health check de cache
curl http://localhost:3000/health/cache
```

### **Probar Optimizaciones de Queries**

```bash
# Ejecutar pruebas de optimización de queries
npx ts-node scripts/test-query-optimizations.ts
```

### **Probar Dashboard con Cache**

```bash
# Las primeras llamadas serán lentas (calculan y cachean)
curl "http://localhost:3000/api/dashboard/stats" -H "Authorization: Bearer YOUR_TOKEN"

# Las siguientes llamadas serán rápidas (desde cache)
curl "http://localhost:3000/api/dashboard/stats" -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 **Métricas de Mejora Esperadas**

| **Aspecto** | **Antes** | **Después** | **Mejora** |
|-------------|-----------|-------------|------------|
| **Tamaño BD** | ~100MB | ~70MB | **30% reducción** |
| **Consultas Dashboard** | 500-800ms | 50-100ms | **80-85% más rápido** |
| **Cálculo de Cobertura** | 100-200ms | 10-30ms | **70-85% más rápido** |
| **Listado de Análisis** | 200-500ms | 50-100ms | **75-80% más rápido** |
| **Uso de Memoria** | Alto (sin cache) | Optimizado | **60% reducción** |
| **Índices** | 5 índices | 12 índices optimizados | **Consultas 50-70% más rápidas** |

---

## 🔧 **Configuración de Redis**

### **Variables de Entorno Requeridas**

```env
# En tu archivo .env
REDIS_URL=redis://localhost:6379
# o para Redis Cloud:
# REDIS_URL=redis://username:password@host:port
```

### **Configuración por Defecto**

- **TTL Dashboard**: 5 minutos
- **TTL Análisis**: 10 minutos
- **TTL Métricas**: 1 hora
- **Reintentos**: 3 con backoff exponencial
- **Timeout**: 60 segundos

---

## 🚨 **Notas Importantes**

### **Backup Recomendado**

```bash
# Crear backup antes de ejecutar la migración
pg_dump your_database > backup_before_cleanup.sql
```

### **Rollback Plan**

Si algo sale mal, puedes revertir con:

```bash
# Revertir migración
npx prisma migrate reset

# Restaurar desde backup
psql your_database < backup_before_cleanup.sql
```

### **Monitoreo Post-Optimización**

- Monitorear logs para verificar que Redis esté funcionando
- Verificar tiempos de respuesta en dashboard
- Monitorear uso de memoria y CPU

---

## 🎯 **Próximas Optimizaciones (Fase 4-6)**

1. **Connection Pooling**: Implementar pool de conexiones PostgreSQL
2. **Data Archiving**: Estrategia de archivado para datos antiguos
3. **Query Optimization**: Más optimizaciones N+1 y eager loading
4. **Monitoring**: Métricas detalladas de rendimiento

---

## ❓ **Solución de Problemas**

### **Redis no se conecta**

```bash
# Verificar que Redis esté corriendo
redis-cli ping

# Si no está corriendo, iniciarlo
redis-server
```

### **Migración falla**

```bash
# Ver logs detallados
npx prisma migrate deploy --verbose

# Ver estado de migraciones
npx prisma migrate status
```

### **Errores de compilación**

```bash
# Limpiar y reconstruir
npm run clean
npm run build
```

---

## 📞 **Soporte**

Si encuentras algún problema:

1. Revisa los logs en `logs/` directory
2. Verifica la configuración de Redis
3. Asegúrate de que la base de datos esté accesible
4. Revisa las variables de entorno

¿Necesitas ayuda con alguna de estas optimizaciones?
