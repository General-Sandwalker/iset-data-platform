import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

const isTest = config.NODE_ENV === 'test';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? Infinity : 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? Infinity : 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isTest ? Infinity : 50,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'AI request limit exceeded. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const publicSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isTest ? Infinity : 20,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many survey submissions, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});