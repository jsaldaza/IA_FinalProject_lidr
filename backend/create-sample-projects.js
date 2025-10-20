const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function createSampleProjects() {
  try {
    console.log("🔄 Creando proyectos de ejemplo...");

    // Primero vamos a verificar si hay un usuario
    let user = await prisma.user.findFirst();

    if (!user) {
      console.log("👤 Creando usuario de ejemplo...");
      user = await prisma.user.create({
        data: {
          email: "admin@testforge.com",
          password:
            "$2b$10$N9qo8uLOickgx2ZMRZoMye.2.zOVzQ6O4NzNKEGgAOTGDa9IhFxUa", // password: admin123
          name: "Admin User",
          role: "ADMIN",
        },
      });
    }

    // Crear proyectos de ejemplo
    const projects = [
      {
        name: "Sistema de E-commerce",
        description:
          "Análisis completo del sistema de comercio electrónico con funcionalidades de carrito de compras, pagos y gestión de inventario.",
        status: "IN_PROGRESS",
        userId: user.id,
      },
      {
        name: "App Móvil de Delivery",
        description:
          "Aplicación móvil para delivery de comida con geolocalización, seguimiento en tiempo real y sistema de calificaciones.",
        status: "COMPLETED",
        userId: user.id,
      },
      {
        name: "Dashboard Analytics",
        description:
          "Panel de control con métricas en tiempo real, reportes automatizados y visualizaciones interactivas.",
        status: "PLANNING",
        userId: user.id,
      },
    ];

    for (const projectData of projects) {
      const existingProject = await prisma.project.findFirst({
        where: { name: projectData.name },
      });

      if (!existingProject) {
        await prisma.project.create({ data: projectData });
        console.log(`✅ Proyecto creado: ${projectData.name}`);
      } else {
        console.log(`⚠️ Proyecto ya existe: ${projectData.name}`);
      }
    }

    console.log("🎉 ¡Proyectos de ejemplo creados exitosamente!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleProjects();
