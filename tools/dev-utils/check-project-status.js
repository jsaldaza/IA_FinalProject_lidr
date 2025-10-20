/**
 * Script para verificar el status real de los proyectos en la base de datos
 */

const { PrismaClient } = require("@prisma/client");

async function checkProjectStatus() {
  const prisma = new PrismaClient();

  let StructuredLogger;
  try {
    StructuredLogger =
      require("../../testforge-backend/dist/utils/structured-logger").StructuredLogger;
  } catch (e) {
    StructuredLogger =
      require("../../testforge-backend/src/utils/structured-logger").StructuredLogger;
  }

  try {
    StructuredLogger.info("VERIFICANDO STATUS DE PROYECTOS EN BASE DE DATOS");

    // Verificar proyectos por status
    const statusCount = await prisma.conversationalAnalysis.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    });

    StructuredLogger.info("PROYECTOS POR STATUS", { statusCount });

    // Obtener detalles de proyectos
    const allProjects = await prisma.conversationalAnalysis.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Log basic metadata; redact full ids
    StructuredLogger.info("DETALLES DE PROYECTOS", {
      count: allProjects.length,
    });
    allProjects.forEach((project, index) => {
      StructuredLogger.info(`Proyecto ${index + 1}`, {
        title: project.title || "Sin título",
        id: String(project.id).substring(0, 8) + "...",
        status: project.status,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      });
    });

    // Verificar que función está devolviendo el endpoint actual
    console.log("\n🎯 SIMULANDO ENDPOINT /api/projects/in-progress:");
    const inProgress = await prisma.conversationalAnalysis.findMany({
      where: {
        status: {
          in: ["IN_PROGRESS", "PAUSED"],
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    StructuredLogger.info("In-progress projects", { found: inProgress.length });
    inProgress.forEach((p) =>
      StructuredLogger.info("In-progress project", {
        title: p.title,
        status: p.status,
      })
    );

    console.log("\n🎯 SIMULANDO ENDPOINT /api/projects/completed:");
    const completed = await prisma.conversationalAnalysis.findMany({
      where: {
        status: "COMPLETED",
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    StructuredLogger.info("Completed projects", { found: completed.length });
    completed.forEach((p) =>
      StructuredLogger.info("Completed project", {
        title: p.title,
        status: p.status,
      })
    );
  } catch (error) {
    StructuredLogger.error("Error checking project status", error, {});
  } finally {
    await prisma.$disconnect();
  }
}

checkProjectStatus();
