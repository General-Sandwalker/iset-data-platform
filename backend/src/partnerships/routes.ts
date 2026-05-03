import { Router } from 'express';
import { z } from 'zod';
import { validate, uuidParam } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireManager } from '../middleware/rbac.js';
import { sendSuccess, sendCreated, paginatedResponse } from '../middleware/response.js';
import { logActivity } from '../middleware/activity-logger.js';
import {
  createCompany, listCompanies, getCompanyById, updateCompany, deleteCompany,
  createOffer, listOffers, getOfferById, updateOffer, deleteOffer,
  createCollaboration, listCollaborations, getCollaborationById, updateCollaboration, deleteCollaboration,
  offerTypes,
} from './service.js';

const router = Router();
router.use(authenticate);

const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  sector: z.string().max(255).optional(),
  address: z.string().optional(),
  contactName: z.string().max(255).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional(),
  partnershipStartDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sector: z.string().max(255).optional(),
  address: z.string().optional(),
  contactName: z.string().max(255).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional(),
  partnershipStartDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

const createOfferSchema = z.object({
  companyId: z.string().uuid(),
  type: z.enum(offerTypes as unknown as [string, ...string[]]),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  requirements: z.string().optional(),
  publishDate: z.string().optional(),
  expiryDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateOfferSchema = z.object({
  companyId: z.string().uuid().optional(),
  type: z.enum(offerTypes as unknown as [string, ...string[]]).optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  publishDate: z.string().optional(),
  expiryDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

const createCollaborationSchema = z.object({
  companyId: z.string().uuid(),
  type: z.string().min(1).max(255),
  description: z.string().optional(),
  date: z.string().optional(),
  academicYear: z.string().max(20).optional(),
});

const updateCollaborationSchema = z.object({
  companyId: z.string().uuid().optional(),
  type: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  academicYear: z.string().max(20).optional(),
});

const listCompaniesQuery = z.object({
  search: z.string().optional(),
  sector: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const listOffersQuery = z.object({
  companyId: z.string().uuid().optional(),
  type: z.enum(offerTypes as unknown as [string, ...string[]]).optional(),
  isActive: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const listCollaborationsQuery = z.object({
  companyId: z.string().uuid().optional(),
  academicYear: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

router.get('/companies', validate({ query: listCompaniesQuery }), async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const limit = req.query.limit ? Math.min(100, parseInt(String(req.query.limit))) : 20;
    const result = await listCompanies({ ...req.query, page, limit } as any);
    paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total });
  } catch (err) { next(err); }
});

router.post('/companies', requireManager, validate({ body: createCompanySchema }), async (req, res, next) => {
  try {
    const company = await createCompany(req.body);
    await logActivity({ userId: req.user!.id, action: 'CREATE_COMPANY', ipAddress: req.ip });
    sendCreated(res, company);
  } catch (err) { next(err); }
});

router.get('/companies/:id', validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const company = await getCompanyById(req.params.id);
    sendSuccess(res, company);
  } catch (err) { next(err); }
});

router.patch('/companies/:id', requireManager, validate({ params: uuidParam, body: updateCompanySchema }), async (req, res, next) => {
  try {
    const company = await updateCompany(req.params.id, req.body);
    await logActivity({ userId: req.user!.id, action: 'UPDATE_COMPANY', ipAddress: req.ip });
    sendSuccess(res, company);
  } catch (err) { next(err); }
});

router.delete('/companies/:id', requireManager, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    await deleteCompany(req.params.id);
    await logActivity({ userId: req.user!.id, action: 'DELETE_COMPANY', ipAddress: req.ip });
    sendSuccess(res, { message: 'Company deleted' });
  } catch (err) { next(err); }
});

router.get('/offers', validate({ query: listOffersQuery }), async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const limit = req.query.limit ? Math.min(100, parseInt(String(req.query.limit))) : 20;
    const result = await listOffers({ ...req.query, page, limit } as any);
    paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total });
  } catch (err) { next(err); }
});

router.post('/offers', requireManager, validate({ body: createOfferSchema }), async (req, res, next) => {
  try {
    const offer = await createOffer(req.body);
    await logActivity({ userId: req.user!.id, action: 'CREATE_OFFER', ipAddress: req.ip });
    sendCreated(res, offer);
  } catch (err) { next(err); }
});

router.get('/offers/:id', validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const offer = await getOfferById(req.params.id);
    sendSuccess(res, offer);
  } catch (err) { next(err); }
});

router.patch('/offers/:id', requireManager, validate({ params: uuidParam, body: updateOfferSchema }), async (req, res, next) => {
  try {
    const offer = await updateOffer(req.params.id, req.body);
    await logActivity({ userId: req.user!.id, action: 'UPDATE_OFFER', ipAddress: req.ip });
    sendSuccess(res, offer);
  } catch (err) { next(err); }
});

router.delete('/offers/:id', requireManager, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    await deleteOffer(req.params.id);
    await logActivity({ userId: req.user!.id, action: 'DELETE_OFFER', ipAddress: req.ip });
    sendSuccess(res, { message: 'Offer deleted' });
  } catch (err) { next(err); }
});

router.get('/collaborations', validate({ query: listCollaborationsQuery }), async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const limit = req.query.limit ? Math.min(100, parseInt(String(req.query.limit))) : 20;
    const result = await listCollaborations({ ...req.query, page, limit } as any);
    paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total });
  } catch (err) { next(err); }
});

router.post('/collaborations', requireManager, validate({ body: createCollaborationSchema }), async (req, res, next) => {
  try {
    const collaboration = await createCollaboration(req.body);
    await logActivity({ userId: req.user!.id, action: 'CREATE_COLLABORATION', ipAddress: req.ip });
    sendCreated(res, collaboration);
  } catch (err) { next(err); }
});

router.get('/collaborations/:id', validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const collaboration = await getCollaborationById(req.params.id);
    sendSuccess(res, collaboration);
  } catch (err) { next(err); }
});

router.patch('/collaborations/:id', requireManager, validate({ params: uuidParam, body: updateCollaborationSchema }), async (req, res, next) => {
  try {
    const collaboration = await updateCollaboration(req.params.id, req.body);
    await logActivity({ userId: req.user!.id, action: 'UPDATE_COLLABORATION', ipAddress: req.ip });
    sendSuccess(res, collaboration);
  } catch (err) { next(err); }
});

router.delete('/collaborations/:id', requireManager, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    await deleteCollaboration(req.params.id);
    await logActivity({ userId: req.user!.id, action: 'DELETE_COLLABORATION', ipAddress: req.ip });
    sendSuccess(res, { message: 'Collaboration deleted' });
  } catch (err) { next(err); }
});

export default router;
