#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

console.log("🚀 Ejecutando migración de limpieza de base de datos...\n");

// Cambiar al directorio del proyecto
const projectRoot = path.resolve(__dirname, "..");
process.chdir(projectRoot);

try {
  console.log("📦 Verificando dependencias...");
  execSync("npm list prisma", { stdio: "inherit" });
} catch (error) {
  console.log("❌ Prisma no está instalado. Instalando...");
  execSync("npm install prisma --save-dev", { stdio: "inherit" });
}

try {
  console.log("\n🗑️  Ejecutando migración de limpieza...");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });

  console.log("\n📊 Generando cliente Prisma actualizado...");
  execSync("npx prisma generate", { stdio: "inherit" });

  console.log("\n🎉 Limpieza de base de datos completada!");
  console.log("\nResumen de cambios:");
  console.log(
    "- ✅ Eliminadas tablas legacy: TestSuite, TestScenario, DomainEvent"
  );
  console.log("- ✅ Eliminado campo legacy: TestCase.analysisId");
  console.log("- ✅ Optimizados índices para dashboard y consultas frecuentes");
  console.log("- ✅ Cliente Prisma actualizado");
} catch (error) {
  console.error("\n❌ Error en la migración:", error.message);
  process.exit(1);
}
