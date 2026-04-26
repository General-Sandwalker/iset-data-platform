import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface JwtPayload {
  id: string;
  cin: string | null;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(new HttpError(401, 'UNAUTHORIZED', 'No token provided'));
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new HttpError(401, 'TOKEN_EXPIRED', 'Token has expired'));
    } else if (err instanceof jwt.JsonWebTokenError) {
      next(new HttpError(401, 'INVALID_TOKEN', 'Invalid token'));
    } else {
      next(new HttpError(401, 'UNAUTHORIZED', 'Authentication failed'));
    }
  }
}

export class HttpError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}