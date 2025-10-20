import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export const validateRequest = (schema: {
    params?: AnyZodObject;
    query?: AnyZodObject;
    body?: AnyZodObject;
}) => {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            if (schema.params) {
                req.params = await schema.params.parseAsync(req.params);
            }
            if (schema.query) {
                req.query = await schema.query.parseAsync(req.query);
            }
            if (schema.body) {
                req.body = await schema.body.parseAsync(req.body);
            }
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                next(new ValidationError('Error de validación', error.errors));
            } else {
                next(error);
            }
        }
    };
}; 