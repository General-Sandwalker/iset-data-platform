import { Response } from 'express';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

export function sendSuccess<T>(res: Response, data: T, meta?: ApiResponse<T>['meta']): void {
  const payload: ApiResponse<T> = {
    success: true,
    data,
  };
  if (meta) {
    payload.meta = meta;
  }
  res.json(payload);
}

export function sendCreated<T>(res: Response, data: T): void {
  res.status(201).json({
    success: true,
    data,
  } as ApiResponse<T>);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: unknown
): void {
  const errorObj: { code: string; message: string; details?: unknown } = { code, message };
  if (details) {
    errorObj.details = details;
  }
  res.status(statusCode).json({
    success: false,
    error: errorObj,
  });
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

export function paginatedResponse<T>(
  res: Response,
  data: T[],
  meta: { page: number; limit: number; total: number }
): void {
  res.json({
    success: true,
    data,
    meta,
  });
}