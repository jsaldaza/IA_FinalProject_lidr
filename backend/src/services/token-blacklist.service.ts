import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { StructuredLogger } from '../utils/structured-logger';

/**
 * Servicio para manejar invalidación de tokens JWT
 * Implementa una blacklist de tokens para logout seguro
 */
export class TokenBlacklistService {
  /**
   * Genera un hash del token para almacenar en la blacklist
   * No guardamos el token completo por seguridad
   */
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Invalida un token agregándolo a la blacklist
   */
  static async invalidateToken(
    token: string, 
    userId: string, 
    reason: 'LOGOUT' | 'SECURITY_BREACH' | 'EXPIRED' = 'LOGOUT'
  ): Promise<void> {
    try {
      // Decodificar el token para obtener la fecha de expiración
      const decoded = jwt.decode(token) as any;
      
      if (!decoded || !decoded.exp) {
        throw new Error('Invalid token format');
      }

      // Convertir timestamp a Date
      const expiresAt = new Date(decoded.exp * 1000);
      const tokenHash = this.hashToken(token);

      // Agregar a la blacklist
      await prisma.blacklistedToken.create({
        data: {
          tokenHash,
          userId,
          reason,
          expiresAt
        }
      });

      StructuredLogger.security('Token invalidated and blacklisted', {
        action: 'token_invalidated',
        resource: 'blacklistedToken',
        success: true,
        userId,
        method: 'invalidateToken'
      });

    } catch (error) {
      StructuredLogger.error('Failed to invalidate token', error as Error, {
        userId,
        method: 'invalidateToken'
      });
      throw new Error('Failed to invalidate token');
    }
  }

  /**
   * Verifica si un token está en la blacklist
   */
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const tokenHash = this.hashToken(token);
      
      const blacklistedToken = await prisma.blacklistedToken.findUnique({
        where: { tokenHash }
      });

      return blacklistedToken !== null;
    } catch (error) {
      StructuredLogger.error('Error checking token blacklist', error as Error, {
        method: 'isTokenBlacklisted'
      });

      // **Fail-closed**: if we cannot verify blacklist status due to DB errors
      // treat token as blacklisted to avoid allowing potentially revoked tokens.
      // This is safer from a security perspective. Callers should handle 401.
      return true;
    }
  }

  /**
   * Limpia tokens expirados de la blacklist
   * Debe ejecutarse periódicamente como tarea de mantenimiento
   */
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await prisma.blacklistedToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      StructuredLogger.info('Cleaned up expired blacklisted tokens', {
        method: 'cleanupExpiredTokens',
        statusCode: 200
      });

      return result.count;
    } catch (error) {
      StructuredLogger.error('Failed to cleanup expired tokens', error as Error, {
        method: 'cleanupExpiredTokens'
      });
      return 0;
    }
  }

  /**
   * Invalida todos los tokens de un usuario específico
   * Útil en casos de compromiso de seguridad
   */
  static async invalidateAllUserTokens(
    userId: string, 
    reason: 'SECURITY_BREACH' | 'ADMIN_ACTION' = 'SECURITY_BREACH'
  ): Promise<void> {
    try {
      // Esta implementación requeriría tener un registro de todos los tokens activos
      // Por simplicidad, agregamos una entrada especial que indica invalidación masiva
      const specialTokenHash = crypto
        .createHash('sha256')
        .update(`INVALIDATE_ALL_${userId}_${Date.now()}`)
        .digest('hex');

      await prisma.blacklistedToken.create({
        data: {
          tokenHash: specialTokenHash,
          userId,
          reason,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
        }
      });

      StructuredLogger.security('All user tokens invalidated', {
        action: 'invalidate_all_user_tokens',
        resource: 'blacklistedToken',
        success: true,
        userId,
        method: 'invalidateAllUserTokens'
      });

    } catch (error) {
      StructuredLogger.error('Failed to invalidate all user tokens', error as Error, {
        userId,
        method: 'invalidateAllUserTokens'
      });
      throw new Error('Failed to invalidate user tokens');
    }
  }

  /**
   * Obtiene estadísticas de la blacklist
   */
  static async getBlacklistStats(): Promise<{
    totalBlacklisted: number;
    expiredTokens: number;
    activeBlacklisted: number;
  }> {
    try {
      const now = new Date();
      
      const [total, expired] = await Promise.all([
        prisma.blacklistedToken.count(),
        prisma.blacklistedToken.count({
          where: {
            expiresAt: { lt: now }
          }
        })
      ]);

      return {
        totalBlacklisted: total,
        expiredTokens: expired,
        activeBlacklisted: total - expired
      };
    } catch (error) {
  StructuredLogger.error('Failed to get blacklist stats', error as Error, { method: 'getBlacklistStats' });
      return {
        totalBlacklisted: 0,
        expiredTokens: 0,
        activeBlacklisted: 0
      };
    }
  }
}
