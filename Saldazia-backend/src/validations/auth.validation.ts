import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string()
        .email('El correo electrónico debe tener un formato válido')
        .min(1, 'El correo electrónico es requerido'),
    password: z.string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener al menos una minúscula, una mayúscula y un número'),
    name: z.string()
        .min(1, 'El nombre es requerido')
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(50, 'El nombre no puede tener más de 50 caracteres')
});

export const loginSchema = z.object({
    email: z.string()
        .email('El correo electrónico debe tener un formato válido')
        .min(1, 'El correo electrónico es requerido'),
    password: z.string()
        .min(1, 'La contraseña es requerida')
});

// Types removed - not used according to ts-prune analysis
// Using z.infer directly where needed instead of exported types 