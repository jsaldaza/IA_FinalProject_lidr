/**
 * Configuración centralizada de autenticación y seguridad
 * Todas las constantes y políticas de seguridad unificadas
 */

export const authConfig = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    algorithm: 'HS256' as const,
    issuer: 'testforge-api',
    audience: 'testforge-client'
  },

  // Password Policy
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAttempts: 3, // intentos fallidos antes de bloqueo temporal
    lockoutDuration: 30 * 60 * 1000, // 30 minutos de bloqueo
    saltRounds: 12 // para bcrypt - más seguro que el default
  },

  // Rate Limiting Configuration
  rateLimit: {
    // Login específico
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      maxAttempts: 5, // 5 intentos por IP
      skipSuccessfulRequests: true,
      skipFailedRequests: false
    },
    
    // Registro de usuarios
    register: {
      windowMs: 60 * 60 * 1000, // 1 hora
      maxAttempts: 3, // 3 registros por IP por hora
      skipSuccessfulRequests: true,
      skipFailedRequests: false
    },
    
    // Rate limiting por email específico
    emailSpecific: {
      maxAttempts: 3, // 3 intentos por email
      windowMs: 30 * 60 * 1000, // 30 minutos
      blockDuration: 30 * 60 * 1000 // 30 minutos de bloqueo
    },
    
    // Rate limiting global para auth
    globalAuth: {
      windowMs: 5 * 60 * 1000, // 5 minutos
      maxAttempts: 20 // 20 requests de auth por IP
    }
  },

  // Session Management
  session: {
    cookieName: 'testforge_token',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      domain: process.env.COOKIE_DOMAIN || undefined
    },
    
    // Blacklist cleanup
    tokenBlacklist: {
      cleanupInterval: 60 * 60 * 1000, // limpiar cada hora
      maxExpiredTokens: 10000 // límite antes de limpieza forzada
    }
  },

  // Security Headers
  security: {
    // Headers que debemos enviar
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'"
    },
    
    // CORS configuration
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
      optionsSuccessStatus: 200
    }
  },

  // Account Security
  account: {
    // Configuración de 2FA (para futuro)
    twoFactor: {
      enabled: false, // por ahora deshabilitado
      serviceName: 'TestForge',
      window: 2, // ventana de tiempo para códigos TOTP
      step: 30 // segundos entre códigos
    },
    
    // Políticas de cuenta
    maxSessions: 5, // máximo 5 sesiones activas simultáneas
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas de inactividad
    passwordChangeInterval: 90 * 24 * 60 * 60 * 1000, // cambio cada 90 días (opcional)
  },

  // Development/Demo Configuration
  development: {
    allowDemoToken: process.env.ALLOW_DEMO_TOKEN === 'true',
    demoUserId: 'demo-user-id',
    demoUserEmail: 'demo@test.com',
    bypassRateLimit: process.env.BYPASS_RATE_LIMIT === 'true'
  },

  // Logging Configuration
  logging: {
    logSuccessfulLogins: true,
    logFailedLogins: true,
    logTokenGeneration: process.env.NODE_ENV === 'development',
    logRateLimitHits: true,
    logSecurityEvents: true,
    
    // Información sensible que NO se debe loggear
    sensitiveFields: ['password', 'token', 'secret', 'key'],
    
    // Nivel de detalle en logs
    securityLogLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'info'
  }
} as const;
