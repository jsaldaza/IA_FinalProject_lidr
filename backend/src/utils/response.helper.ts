import { Response as ExpressResponse } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
  timestamp?: string;
}

export class ResponseHelper {
  static success<T>(res: ExpressResponse, data: T, message?: string, statusCode: number = 200): ExpressResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    };
    return res.status(statusCode).json(response);
  }

  static error(res: ExpressResponse, error: string, details?: any, statusCode: number = 500): ExpressResponse {
    const response: ApiResponse = {
      success: false,
      error,
      details,
      timestamp: new Date().toISOString()
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: ExpressResponse, data: T, message?: string): ExpressResponse {
    return this.success(res, data, message, 201);
  }

  static badRequest(res: ExpressResponse, error: string, details?: any): ExpressResponse {
    return this.error(res, error, details, 400);
  }

  static unauthorized(res: ExpressResponse, error: string = 'Unauthorized'): ExpressResponse {
    return this.error(res, error, null, 401);
  }

  static forbidden(res: ExpressResponse, error: string = 'Forbidden'): ExpressResponse {
    return this.error(res, error, null, 403);
  }

  static notFound(res: ExpressResponse, error: string = 'Not found'): ExpressResponse {
    return this.error(res, error, null, 404);
  }
}