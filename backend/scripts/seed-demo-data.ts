import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // 1. Crear usuarios
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const users = await Promise.all([
        prisma.user.upsert({
            where: { email: 'user1@example.com' },
            update: {},
            create: {
                email: 'user1@example.com',
                password: passwordHash,
                name: 'Usuario Uno',
            },
        }),
        prisma.user.upsert({
            where: { email: 'user2@example.com' },
            update: {},
            create: {
                email: 'user2@example.com',
                password: passwordHash,
                name: 'Usuario Dos',
            },
        }),
    ]);

    // 2. Crear proyectos
    const projects = await Promise.all([
        prisma.project.create({
            data: {
                name: 'Sistema de E-commerce',
                description: 'Análisis completo del sistema de comercio electrónico con funcionalidades de carrito de compras, pagos y gestión de inventario.',
                userId: users[0].id,
            },
        }),
        prisma.project.create({
            data: {
                name: 'App Móvil de Delivery',
                description: 'Aplicación móvil para delivery de comida con geolocalización, seguimiento en tiempo real y sistema de calificaciones.',
                userId: users[0].id,
            },
        }),
        prisma.project.create({
            data: {
                name: 'Dashboard Analytics',
                description: 'Panel de control con métricas en tiempo real, reportes automatizados y visualizaciones interactivas.',
                userId: users[1].id,
            },
        }),
    ]);

    // 3. Crear análisis
    await prisma.analysis.create({
        data: {
            requirement: 'El sistema debe permitir la autenticación de usuarios y la gestión de proyectos.',
            summary: 'Este análisis cubre autenticación y gestión de proyectos.',
            redFlags: ['Falta de validación de email', 'No hay límite de intentos de login'],
            status: 'COMPLETED',
            userId: users[0].id,
            projectId: projects[0].id,
            questions: {
                create: [
                    { content: '¿Qué tipo de autenticación se requiere?', type: 'CLARIFICATION', priority: 'HIGH' },
                    { content: '¿Se debe permitir login social?', type: 'REQUIREMENT', priority: 'MEDIUM' },
                ],
            },
            testStrategies: {
                create: [
                    {
                        title: 'Estrategia de autenticación',
                        description: 'Probar login, logout y recuperación de contraseña.',
                        steps: [
                            { description: 'Intentar login con credenciales válidas' },
                            { description: 'Intentar login con credenciales inválidas' },
                            { description: 'Probar recuperación de contraseña' },
                        ],
                        coverage: ['Functional', 'Security'],
                        priority: 'HIGH',
                    },
                ],
            },
        },
    });

    await prisma.analysis.create({
        data: {
            requirement: 'El sistema debe permitir la gestión de tareas y asignación a usuarios.',
            summary: 'Este análisis cubre gestión de tareas y asignaciones.',
            redFlags: ['No se define límite de tareas por usuario'],
            status: 'IN_PROGRESS',
            userId: users[1].id,
            projectId: projects[1].id,
            questions: {
                create: [
                    { content: '¿Las tareas pueden tener subtareas?', type: 'CLARIFICATION', priority: 'MEDIUM' },
                ],
            },
            testStrategies: {
                create: [
                    {
                        title: 'Estrategia de tareas',
                        description: 'Probar creación, edición y asignación de tareas.',
                        steps: [
                            { description: 'Crear tarea y asignar a usuario' },
                            { description: 'Editar tarea existente' },
                        ],
                        coverage: ['Functional'],
                        priority: 'MEDIUM',
                    },
                ],
            },
        },
    });

    console.log('Datos de ejemplo insertados correctamente.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 