 
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validateRequest = (config: { body?: z.ZodSchema; query?: z.ZodSchema; params?: z.ZodSchema }) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            if (config.body) {
                const result = config.body.parse(req.body);
                req.body = result;
            }

            if (config.query) {
                const result = config.query.parse(req.query);
                // Express 5 exposes req.query via a getter; mutate in place to avoid setter errors
                Object.assign(req.query, result);
            }

            if (config.params) {
                const result = config.params.parse(req.params);
                req.params = result;
            }

            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.errors.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }));
                res.status(400).json({
                    status: 'error',
                    message: 'Datos de entrada inválidos',
                    errors
                });
                return;
            }
            next(error);
        }
    };
};
