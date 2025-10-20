import { Response } from 'express';

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: string;
  };
  timestamp: string;
}

export interface ApiError {
  status: 'error';
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}

export class ResponseHandler {
  /**
   * Send a successful response
   */
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200,
    meta?: ApiResponse['meta']
  ): Response<ApiResponse<T>> {
    const response: ApiResponse<T> = {
      status: 'success',
      message,
      data,
      meta: {
        ...meta,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send an error response
   */
  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
  ): Response<ApiError> {
    const response: ApiError = {
      status: 'error',
      message,
      code,
      details,
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send a paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    },
    message?: string
  ): Response<ApiResponse<T[]>> {
    return this.success(
      res,
      data,
      message,
      200,
      {
        pagination,
        timestamp: new Date().toISOString(),
      }
    );
  }

  /**
   * Send a no content response
   */
  static noContent(res: Response, message?: string): Response {
    return res.status(204).json({
      status: 'success',
      message: message || 'No content',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send a created response
   */
  static created<T>(
    res: Response,
    data: T,
    message?: string
  ): Response<ApiResponse<T>> {
    return this.success(res, data, message || 'Resource created successfully', 201);
  }
}