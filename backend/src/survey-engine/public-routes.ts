import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { validate } from '../middleware/validation.js';
import { sendSuccess, sendCreated } from '../middleware/response.js';
import { config } from '../config/env.js';
import { publicSubmissionLimiter } from '../middleware/rate-limit.js';
import { getSurveyBySlug, submitSurveyResponse } from './service.js';

export const publicSurveyRoutes = Router();

const slugParam = z.object({
  slug: z.string().uuid(),
});

const submitSchema = z.object({
  responses: z.record(z.any()),
});

function extractCinFromToken(req: { headers: { authorization?: string } }): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(authHeader.substring(7), config.JWT_SECRET, { algorithms: ['HS256'] }) as any;
    return payload.cin || null;
  } catch {
    return null;
  }
}

publicSurveyRoutes.get('/surveys/:slug', validate({ params: slugParam }), async (req, res, next) => {
  try {
    const survey = await getSurveyBySlug(req.params.slug);

    if (survey.access_type === 'authenticated') {
      const cin = extractCinFromToken(req as any);
      if (!cin && !req.headers.authorization?.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'This survey requires authentication' },
        });
      }
    }

    const publicSurvey = {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      accessType: survey.access_type,
      allowMultipleResponses: survey.allow_multiple_responses,
      questions: survey.questions.map(q => ({
        id: q.id,
        type: q.type,
        label: q.label,
        configJson: q.config_json,
        isRequired: q.is_required,
        orderIndex: q.order_index,
      })),
    };

    sendSuccess(res, publicSurvey);
  } catch (err) { next(err); }
});

publicSurveyRoutes.post('/surveys/:slug/submit', publicSubmissionLimiter, validate({ params: slugParam, body: submitSchema }), async (req, res, next) => {
  try {
    const survey = await getSurveyBySlug(req.params.slug);

    let userCin: string | undefined;

    if (survey.access_type === 'authenticated') {
      const cin = extractCinFromToken(req as any);
      if (!cin) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid or expired authentication token' },
        });
      }
      userCin = cin;
    }

    const record = await submitSurveyResponse(req.params.slug, req.body.responses, userCin);
    sendCreated(res, { id: record.id, submittedAt: record.created_at });
  } catch (err) { next(err); }
});
