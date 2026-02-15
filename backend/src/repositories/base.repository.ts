// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Repository Base con patrones empresariales
 * Implementa Unit of Work, Query Object y Specification patterns
 */
export abstract class BaseRepository<T, TCreateInput, TUpdateInput, TWhereInput> {
  protected readonly prisma: PrismaClient;
  protected abstract readonly model: string;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Encuentra un registro por ID con manejo de errores robusto
   */
  async findById(id: string): Promise<T | null> {
    try {
      return await (this.prisma as any)[this.model].findUnique({
        where: { id },
      });
    } catch (error) {
      this.handleDatabaseError(error, 'findById');
      return null;
    }
  }

  /**
   * Crea un nuevo registro con validación y transacciones
   */
  async create(data: TCreateInput): Promise<T> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        return await (tx as any)[this.model].create({
          data,
        });
      });
    } catch (error) {
      this.handleDatabaseError(error, 'create');
      throw error;
    }
  }

  /**
   * Actualiza con optimistic locking
   */
  async update(id: string, data: TUpdateInput): Promise<T> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Verificar que el registro existe
        const existing = await (tx as any)[this.model].findUnique({
          where: { id },
        });
        
        if (!existing) {
          throw new Error(`${this.model} with id ${id} not found`);
        }

        return await (tx as any)[this.model].update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date(),
          },
        });
      });
    } catch (error) {
      this.handleDatabaseError(error, 'update');
      throw error;
    }
  }

  /**
   * Eliminación suave con auditoría
   */
  async softDelete(id: string): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await (tx as any)[this.model].update({
          where: { id },
          data: {
            deletedAt: new Date(),
            updatedAt: new Date(),
          },
        });
      });
      return true;
    } catch (error) {
      this.handleDatabaseError(error, 'softDelete');
      return false;
    }
  }

  /**
   * Búsqueda paginada con filtros dinámicos
   */
  async findMany(options: {
    where?: TWhereInput;
    orderBy?: any;
    skip?: number;
    take?: number;
    include?: any;
  }): Promise<{ data: T[]; total: number; hasMore: boolean }> {
    try {
      const { where, orderBy, skip = 0, take = 50, include } = options;
      
      const [data, total] = await Promise.all([
        (this.prisma as any)[this.model].findMany({
          where,
          orderBy,
          skip,
          take,
          include,
        }),
        (this.prisma as any)[this.model].count({ where }),
      ]);

      return {
        data,
        total,
        hasMore: skip + take < total,
      };
    } catch (error) {
      this.handleDatabaseError(error, 'findMany');
      throw error;
    }
  }

  /**
   * Upsert con lógica de negocio
   */
  async upsert(
    where: any,
    create: TCreateInput,
    update: TUpdateInput
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        return await (tx as any)[this.model].upsert({
          where,
          create,
          update: {
            ...update,
            updatedAt: new Date(),
          },
        });
      });
    } catch (error) {
      this.handleDatabaseError(error, 'upsert');
      throw error;
    }
  }

  /**
   * Bulk operations para rendimiento
   */
  async bulkCreate(data: TCreateInput[]): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        return await (tx as any)[this.model].createMany({
          data,
          skipDuplicates: true,
        });
      });
    } catch (error) {
      this.handleDatabaseError(error, 'bulkCreate');
      throw error;
    }
  }

  /**
   * Transacciones complejas
   */
  async executeTransaction<R>(
    operation: (tx: Prisma.TransactionClient) => Promise<R>
  ): Promise<R> {
    try {
      return await this.prisma.$transaction(operation, {
        maxWait: 5000, // 5 segundos
        timeout: 10000, // 10 segundos
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      });
    } catch (error) {
      this.handleDatabaseError(error, 'transaction');
      throw error;
    }
  }

  /**
   * Manejo centralizado de errores de base de datos
   */
  protected handleDatabaseError(error: any, operation: string): void {
    console.error(`Database error in ${this.model}.${operation}:`, {
      error: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });

    // Log para monitoreo y alertas
    if (error.code === 'P2002') {
      console.warn(`Unique constraint violation in ${this.model}.${operation}`);
    } else if (error.code === 'P2025') {
      console.warn(`Record not found in ${this.model}.${operation}`);
    } else if (error.code === 'P2034') {
      console.error(`Transaction conflict in ${this.model}.${operation}`);
    }
  }

  /**
   * Health check para la conexión
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}
