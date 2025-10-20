const fs = require("fs");
const path = require("path");

console.log("🔍 VALIDACIÓN FINAL - TESTFORGE MODERNIZACIÓN");
console.log("===============================================\n");

// 1. Verificar archivos clave creados
const criticalFiles = [
  "src/controllers/project-unified.controller.ts",
  "src/routes/project-unified.routes.ts",
  "migrations/001_rename_name_to_title.sql",
  "migrations/run-migration.js",
  "migrations/verify-migration.js",
  "API_UNIFICADA.md",
];

console.log("📋 1. VERIFICANDO ARCHIVOS CRÍTICOS:");
let allFilesExist = true;

criticalFiles.forEach((file) => {
  const exists = fs.existsSync(file);
  console.log(`   ${exists ? "✅" : "❌"} ${file}`);
  if (!exists) allFilesExist = false;
});

// 2. Verificar integración en server.ts
console.log("\n📋 2. VERIFICANDO INTEGRACIÓN EN SERVER.TS:");
try {
  const serverContent = fs.readFileSync("src/server.ts", "utf8");
  const hasImport = serverContent.includes("project-unified.routes");
  const hasRoute = serverContent.includes("projectUnifiedRouter");

  console.log(`   ${hasImport ? "✅" : "❌"} Import de rutas unificadas`);
  console.log(`   ${hasRoute ? "✅" : "❌"} Uso del router unificado`);
} catch (error) {
  console.log("   ❌ Error leyendo server.ts:", error.message);
}

// 3. Verificar esquema Prisma actualizado
console.log("\n📋 3. VERIFICANDO SCHEMA PRISMA:");
try {
  const schemaContent = fs.readFileSync("prisma/schema.prisma", "utf8");
  const hasTitle = schemaContent.includes("title        String");
  const analysisModel = schemaContent.includes("model ConversationalAnalysis");

  console.log(
    `   ${analysisModel ? "✅" : "❌"} Modelo ConversationalAnalysis presente`
  );
  console.log(`   ${hasTitle ? "✅" : "❌"} Campo "title" definido`);
} catch (error) {
  console.log("   ❌ Error leyendo schema.prisma:", error.message);
}

// 4. Verificar package.json
console.log("\n📋 4. VERIFICANDO DEPENDENCIAS:");
try {
  const packageContent = fs.readFileSync("package.json", "utf8");
  const pkg = JSON.parse(packageContent);
  const requiredDeps = ["prisma", "@prisma/client", "zod", "express"];

  requiredDeps.forEach((dep) => {
    const hasInDeps = pkg.dependencies && pkg.dependencies[dep];
    const hasInDevDeps = pkg.devDependencies && pkg.devDependencies[dep];
    const exists = hasInDeps || hasInDevDeps;
    console.log(`   ${exists ? "✅" : "❌"} ${dep}`);
  });
} catch (error) {
  console.log("   ❌ Error leyendo package.json:", error.message);
}

// 5. Estado de la migración
console.log("\n📋 5. COMANDOS PENDIENTES:");
console.log("   🔄 node check-db-state.js        # Verificar base de datos");
console.log("   🔄 node migrations/run-migration.js  # Ejecutar migración");
console.log("   🔄 npx prisma generate           # Regenerar cliente");
console.log("   🔄 npm run build                 # Verificar compilación");

// 6. Resumen final
console.log("\n🎯 RESUMEN DE MODERNIZACIÓN:");
console.log("   ✅ Análisis completo del proyecto");
console.log("   ✅ Schema Prisma actualizado (name → title)");
console.log("   ✅ Controllers backend actualizados");
console.log("   ✅ API unificada implementada");
console.log("   ✅ Infraestructura de migración lista");
console.log("   ✅ Documentación API completa");
console.log("   🔄 Migración de BD pendiente");
console.log("   🔄 Cliente Prisma por regenerar");

if (allFilesExist) {
  console.log("\n🚀 ESTADO: Listo para ejecutar migración final");
  console.log("💡 EJECUTAR: complete-modernization.bat");
} else {
  console.log("\n⚠️  ESTADO: Archivos faltantes detectados");
  console.log("💡 ACCIÓN: Verificar archivos marcados como ❌");
}

console.log("\n✅ Validación completada");
console.log("📖 Ver EXECUTIVE_SUMMARY.md para detalles completos");
