// 🌟 CLIENTE PRISMA OPTIMIZADO PARA MONGODB ATLAS
// ==============================================
import { PrismaClient } from '@prisma/client';

// Configuración optimizada para MongoDB Atlas
// Nota: omitimos tipado estricto de Prisma options para evitar incompatibilidades de runtime
// (el cliente Mongo de Prisma no exporta LogLevel/PrismaClientOptions en esta versión).
const prismaOptions = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

// Singleton pattern optimizado para MongoDB Atlas
declare global {
  var __prisma: PrismaClient | undefined;
}

class PrismaService {
  private static instance: PrismaClient;

  public static getInstance(): PrismaClient {
    if (!PrismaService.instance) {
      PrismaService.instance = global.__prisma || new PrismaClient(prismaOptions);
      
      // Solo en desarrollo mantener la instancia global
      if (process.env.NODE_ENV !== 'production') {
        global.__prisma = PrismaService.instance;
      }
      
      // Manejar conexión y desconexión
      PrismaService.setupConnectionHandlers();
    }
    
    return PrismaService.instance;
  }

  private static setupConnectionHandlers() {
    // Conectar automáticamente
    PrismaService.instance.$connect().catch((error) => {
      console.error('❌ Error conectando a MongoDB Atlas:', error);
    });

    // Manejar shutdown graceful
    process.on('beforeExit', async () => {
      await PrismaService.instance.$disconnect();
    });

    process.on('SIGINT', async () => {
      await PrismaService.instance.$disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await PrismaService.instance.$disconnect();
      process.exit(0);
    });
  }
}

// Exportar la instancia
export const prisma = PrismaService.getInstance();

// Middleware para logging mejorado en desarrollo
if (process.env.NODE_ENV === 'development') {
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();
    
    console.log(`🔍 Query ${params.model}.${params.action} took ${after - before}ms`);
    return result;
  });
}

// Función para health check de la base de datos
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Health check simple para MongoDB
    await prisma.user.findFirst();
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
}

// Función para obtener estadísticas básicas
export async function getDatabaseStats() {
  try {
    const [totalUsers, totalAnalyses, totalTestCases] = await Promise.all([
      prisma.user.count(),
      prisma.conversationalAnalysis.count(),
      prisma.testCase.count(),
    ]);
    
    return {
      total_users: totalUsers,
      total_analyses: totalAnalyses,
      total_test_cases: totalTestCases,
      database_type: 'MongoDB Atlas'
    };
  } catch (error) {
    console.error('❌ Error getting database stats:', error);
    return null;
  }
}

export default prisma;
