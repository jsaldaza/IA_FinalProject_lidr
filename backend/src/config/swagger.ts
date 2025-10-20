import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'TestForge API',
            version,
            description: 'API para la plataforma de gestión y análisis de pruebas TestForge',
            contact: {
                name: 'Soporte TestForge',
                email: 'soporte@testforge.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Servidor de desarrollo'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                Project: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID único del proyecto'
                        },
                        title: {
                            type: 'string',
                            description: 'Título del proyecto'
                        },
                        description: {
                            type: 'string',
                            description: 'Descripción detallada del proyecto'
                        },
                        status: {
                            type: 'string',
                            enum: ['IN_PROGRESS', 'COMPLETED', 'PAUSED', 'ARCHIVED'],
                            description: 'Estado actual del proyecto'
                        },
                        phase: {
                            type: 'string',
                            description: 'Fase actual del análisis'
                        },
                        progress: {
                            type: 'number',
                            minimum: 0,
                            maximum: 100,
                            description: 'Porcentaje de completitud'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Fecha de creación'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Última fecha de actualización'
                        }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        email: {
                            type: 'string',
                            format: 'email'
                        },
                        name: {
                            type: 'string'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            example: 'error'
                        },
                        message: {
                            type: 'string',
                            description: 'Descripción del error'
                        },
                        code: {
                            type: 'string',
                            description: 'Código de error específico'
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                ValidationError: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            example: 'error'
                        },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    field: {
                                        type: 'string',
                                        description: 'Campo que falló la validación'
                                    },
                                    message: {
                                        type: 'string',
                                        description: 'Mensaje de error de validación'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        security: [{
            bearerAuth: []
        }]
    },
    apis: ['./src/routes/*.ts', './src/models/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options); 