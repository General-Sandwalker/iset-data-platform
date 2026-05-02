import { query } from '../config/database.js';
import { HttpError } from '../middleware/auth.js';

export const offerTypes = ['stage', 'emploi'] as const;
export type OfferType = (typeof offerTypes)[number];

export interface Company {
  id: string;
  name: string;
  sector: string | null;
  address: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  partnership_start_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  company_id: string;
  type: OfferType;
  title: string;
  description: string | null;
  requirements: string | null;
  publish_date: string | null;
  expiry_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Collaboration {
  id: string;
  company_id: string;
  type: string;
  description: string | null;
  date: string | null;
  academic_year: string | null;
  created_at: string;
  updated_at: string;
}

export async function createCompany(data: {
  name: string;
  sector?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  partnershipStartDate?: string;
  isActive?: boolean;
}): Promise<Company> {
  const result = await query<Company>(
    `INSERT INTO companies (name, sector, address, contact_name, contact_email, contact_phone, partnership_start_date, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [data.name, data.sector || null, data.address || null, data.contactName || null, data.contactEmail || null, data.contactPhone || null, data.partnershipStartDate || null, data.isActive !== undefined ? data.isActive : true]
  );
  return result.rows[0];
}

export async function listCompanies(options?: { search?: string; sector?: string; isActive?: boolean }): Promise<Company[]> {
  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;
  if (options?.search) {
    conditions.push(`(name ILIKE $${i} OR contact_name ILIKE $${i} OR sector ILIKE $${i})`);
    values.push(`%${options.search}%`);
    i++;
  }
  if (options?.sector) {
    conditions.push(`sector = $${i}`);
    values.push(options.sector);
    i++;
  }
  if (options?.isActive !== undefined) {
    conditions.push(`is_active = $${i}`);
    values.push(options.isActive);
    i++;
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query<Company>(`SELECT * FROM companies ${where} ORDER BY name ASC`, values);
  return result.rows;
}

export async function getCompanyById(id: string): Promise<Company> {
  const result = await query<Company>(`SELECT * FROM companies WHERE id = $1`, [id]);
  if (result.rows.length === 0) throw new HttpError(404, 'COMPANY_NOT_FOUND', 'Company not found');
  return result.rows[0];
}

export async function updateCompany(id: string, data: {
  name?: string; sector?: string; address?: string; contactName?: string;
  contactEmail?: string; contactPhone?: string; partnershipStartDate?: string; isActive?: boolean;
}): Promise<Company> {
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  const map: Record<string, any> = {
    name: data.name, sector: data.sector, address: data.address,
    contact_name: data.contactName, contact_email: data.contactEmail,
    contact_phone: data.contactPhone, partnership_start_date: data.partnershipStartDate,
    is_active: data.isActive,
  };
  for (const [col, val] of Object.entries(map)) {
    if (val !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(val);
    }
  }
  if (fields.length === 0) throw new HttpError(400, 'NO_FIELDS', 'No fields to update');
  fields.push(`updated_at = NOW()`);
  values.push(id);
  const result = await query<Company>(`UPDATE companies SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
  if (result.rows.length === 0) throw new HttpError(404, 'COMPANY_NOT_FOUND', 'Company not found');
  return result.rows[0];
}

export async function deleteCompany(id: string): Promise<void> {
  const result = await query(`DELETE FROM companies WHERE id = $1`, [id]);
  if (result.rowCount === 0) throw new HttpError(404, 'COMPANY_NOT_FOUND', 'Company not found');
}

export async function createOffer(data: {
  companyId: string; type: OfferType; title: string; description?: string;
  requirements?: string; publishDate?: string; expiryDate?: string; isActive?: boolean;
}): Promise<Offer> {
  await getCompanyById(data.companyId);
  const result = await query<Offer>(
    `INSERT INTO offers (company_id, type, title, description, requirements, publish_date, expiry_date, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [data.companyId, data.type, data.title, data.description || null, data.requirements || null, data.publishDate || null, data.expiryDate || null, data.isActive !== undefined ? data.isActive : true]
  );
  return result.rows[0];
}

export async function listOffers(options?: { companyId?: string; type?: OfferType; isActive?: boolean }): Promise<Offer[]> {
  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;
  if (options?.companyId) {
    conditions.push(`company_id = $${i}`);
    values.push(options.companyId);
    i++;
  }
  if (options?.type) {
    conditions.push(`type = $${i}`);
    values.push(options.type);
    i++;
  }
  if (options?.isActive !== undefined) {
    conditions.push(`is_active = $${i}`);
    values.push(options.isActive);
    i++;
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query<Offer>(`SELECT * FROM offers ${where} ORDER BY created_at DESC`, values);
  return result.rows;
}

export async function getOfferById(id: string): Promise<Offer> {
  const result = await query<Offer>(`SELECT * FROM offers WHERE id = $1`, [id]);
  if (result.rows.length === 0) throw new HttpError(404, 'OFFER_NOT_FOUND', 'Offer not found');
  return result.rows[0];
}

export async function updateOffer(id: string, data: {
  companyId?: string; type?: OfferType; title?: string; description?: string;
  requirements?: string; publishDate?: string; expiryDate?: string; isActive?: boolean;
}): Promise<Offer> {
  if (data.companyId) await getCompanyById(data.companyId);
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  const map: Record<string, any> = {
    company_id: data.companyId, type: data.type, title: data.title,
    description: data.description, requirements: data.requirements,
    publish_date: data.publishDate, expiry_date: data.expiryDate, is_active: data.isActive,
  };
  for (const [col, val] of Object.entries(map)) {
    if (val !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(val);
    }
  }
  if (fields.length === 0) throw new HttpError(400, 'NO_FIELDS', 'No fields to update');
  fields.push(`updated_at = NOW()`);
  values.push(id);
  const result = await query<Offer>(`UPDATE offers SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
  if (result.rows.length === 0) throw new HttpError(404, 'OFFER_NOT_FOUND', 'Offer not found');
  return result.rows[0];
}

export async function deleteOffer(id: string): Promise<void> {
  const result = await query(`DELETE FROM offers WHERE id = $1`, [id]);
  if (result.rowCount === 0) throw new HttpError(404, 'OFFER_NOT_FOUND', 'Offer not found');
}

export async function createCollaboration(data: {
  companyId: string; type: string; description?: string; date?: string; academicYear?: string;
}): Promise<Collaboration> {
  await getCompanyById(data.companyId);
  const result = await query<Collaboration>(
    `INSERT INTO collaborations (company_id, type, description, date, academic_year)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.companyId, data.type, data.description || null, data.date || null, data.academicYear || null]
  );
  return result.rows[0];
}

export async function listCollaborations(options?: { companyId?: string; academicYear?: string }): Promise<Collaboration[]> {
  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;
  if (options?.companyId) {
    conditions.push(`company_id = $${i}`);
    values.push(options.companyId);
    i++;
  }
  if (options?.academicYear) {
    conditions.push(`academic_year = $${i}`);
    values.push(options.academicYear);
    i++;
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query<Collaboration>(`SELECT * FROM collaborations ${where} ORDER BY date DESC NULLS LAST`, values);
  return result.rows;
}

export async function getCollaborationById(id: string): Promise<Collaboration> {
  const result = await query<Collaboration>(`SELECT * FROM collaborations WHERE id = $1`, [id]);
  if (result.rows.length === 0) throw new HttpError(404, 'COLLABORATION_NOT_FOUND', 'Collaboration not found');
  return result.rows[0];
}

export async function updateCollaboration(id: string, data: {
  companyId?: string; type?: string; description?: string; date?: string; academicYear?: string;
}): Promise<Collaboration> {
  if (data.companyId) await getCompanyById(data.companyId);
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  const map: Record<string, any> = {
    company_id: data.companyId, type: data.type, description: data.description,
    date: data.date, academic_year: data.academicYear,
  };
  for (const [col, val] of Object.entries(map)) {
    if (val !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(val);
    }
  }
  if (fields.length === 0) throw new HttpError(400, 'NO_FIELDS', 'No fields to update');
  fields.push(`updated_at = NOW()`);
  values.push(id);
  const result = await query<Collaboration>(`UPDATE collaborations SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
  if (result.rows.length === 0) throw new HttpError(404, 'COLLABORATION_NOT_FOUND', 'Collaboration not found');
  return result.rows[0];
}

export async function deleteCollaboration(id: string): Promise<void> {
  const result = await query(`DELETE FROM collaborations WHERE id = $1`, [id]);
  if (result.rowCount === 0) throw new HttpError(404, 'COLLABORATION_NOT_FOUND', 'Collaboration not found');
}
