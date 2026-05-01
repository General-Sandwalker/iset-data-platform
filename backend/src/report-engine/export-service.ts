import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import archiver from 'archiver';
import { getGeneratedReportById, getTemplateById, type GeneratedReport, type ReportSection } from './service.js';

const EXPORTS_DIR = path.join(process.cwd(), 'uploads', 'exports');

function ensureExportsDir(): void {
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
}

function buildHtmlPreview(report: GeneratedReport, templateName: string): string {
  const content = report.content as { sections?: ReportSection[] } | null;
  const sections = content?.sections || [];

  const sectionsHtml = sections
    .map(
      (s) => `
    <div style="margin-bottom:24px;">
      <h2 style="color:#1a1a2e;border-bottom:2px solid #e94560;padding-bottom:8px;">${escapeHtml(s.title)}</h2>
      <p style="line-height:1.8;color:#333;">${escapeHtml(s.content)}</p>
    </div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(templateName)}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h1 { color: #1a1a2e; text-align: center; border-bottom: 3px solid #e94560; padding-bottom: 12px; }
    .meta { text-align: center; color: #666; margin-bottom: 32px; font-size: 14px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(templateName)}</h1>
  <div class="meta">CIN: ${escapeHtml(report.user_cin || 'N/A')} | Généré le: ${new Date(report.created_at).toLocaleDateString('fr-FR')}</div>
  ${sectionsHtml}
  <footer style="margin-top:48px;text-align:center;color:#999;font-size:12px;">ISET Tozeur — Observatoire Numérique</footer>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function exportReportPdf(reportId: string): Promise<{ filePath: string; fileName: string }> {
  const report = await getGeneratedReportById(reportId);
  const template = await getTemplateById(report.template_id);

  ensureExportsDir();

  const fileName = `${sanitizeFilename(template.name)}_${report.user_cin || 'no-cin'}_${report.id}.pdf`;
  const filePath = path.join(EXPORTS_DIR, fileName);

  const content = report.content as { sections?: ReportSection[] } | null;
  const sections = content?.sections || [];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      info: {
        Title: template.name,
        Author: 'ISET Tozeur Observatoire',
        Subject: `Report for CIN: ${report.user_cin || 'N/A'}`,
      },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(22).fillColor('#1a1a2e').text(template.name, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666666').text(
      `CIN: ${report.user_cin || 'N/A'}  |  Généré le: ${new Date(report.created_at).toLocaleDateString('fr-FR')}`,
      { align: 'center' }
    );
    doc.moveDown(0.3);
    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#e94560').lineWidth(2).stroke();
    doc.moveDown(1);

    for (const section of sections) {
      doc.fontSize(14).fillColor('#1a1a2e').text(section.title);
      doc.moveDown(0.3);
      doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#dddddd').lineWidth(0.5).stroke();
      doc.moveDown(0.4);
      doc.fontSize(11).fillColor('#333333').text(section.content, { lineGap: 4 });
      doc.moveDown(1);
    }

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#999999').text('ISET Tozeur — Observatoire Numérique', { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve({ filePath, fileName }));
    stream.on('error', reject);
  });
}

export async function exportReportExcel(reportId: string): Promise<{ filePath: string; fileName: string }> {
  const report = await getGeneratedReportById(reportId);
  const template = await getTemplateById(report.template_id);

  ensureExportsDir();

  const fileName = `${sanitizeFilename(template.name)}_${report.user_cin || 'no-cin'}_${report.id}.xlsx`;
  const filePath = path.join(EXPORTS_DIR, fileName);

  const content = report.content as { sections?: ReportSection[] } | null;
  const sections = content?.sections || [];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ISET Tozeur Observatoire';
  workbook.created = new Date();

  const infoSheet = workbook.addWorksheet('Informations');
  infoSheet.columns = [
    { header: 'Champ', key: 'field', width: 25 },
    { header: 'Valeur', key: 'value', width: 50 },
  ];
  infoSheet.addRow({ field: 'Titre du rapport', value: template.name });
  infoSheet.addRow({ field: 'Description', value: template.description || '' });
  infoSheet.addRow({ field: 'CIN', value: report.user_cin || 'N/A' });
  infoSheet.addRow({ field: 'Statut', value: report.status });
  infoSheet.addRow({ field: 'Date de génération', value: new Date(report.created_at).toLocaleDateString('fr-FR') });

  infoSheet.getRow(1).font = { bold: true };

  const sectionsSheet = workbook.addWorksheet('Sections du rapport');
  sectionsSheet.columns = [
    { header: 'Titre', key: 'title', width: 30 },
    { header: 'Contenu', key: 'content', width: 80 },
  ];

  for (const section of sections) {
    sectionsSheet.addRow({ title: section.title, content: section.content });
  }

  sectionsSheet.getRow(1).font = { bold: true };

  await workbook.xlsx.writeFile(filePath);

  return { filePath, fileName };
}

export async function getReportHtmlPreview(reportId: string): Promise<{ html: string; templateName: string }> {
  const report = await getGeneratedReportById(reportId);
  const template = await getTemplateById(report.template_id);
  const html = buildHtmlPreview(report, template.name);
  return { html, templateName: template.name };
}

export function cleanupOldExports(maxAgeHours: number = 24): number {
  ensureExportsDir();

  const files = fs.readdirSync(EXPORTS_DIR);
  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  let deleted = 0;

  for (const file of files) {
    const filePath = path.join(EXPORTS_DIR, file);
    try {
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    } catch {
      continue;
    }
  }

  return deleted;
}

export async function exportReportsZip(reportIds: string[]): Promise<{ filePath: string; fileName: string }> {
  ensureExportsDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const zipFileName = `batch_reports_${timestamp}.zip`;
  const zipPath = path.join(EXPORTS_DIR, zipFileName);

  const pdfs: { pdfPath: string; pdfName: string }[] = [];

  for (const reportId of reportIds) {
    try {
      const result = await exportReportPdf(reportId);
      pdfs.push({ pdfPath: result.filePath, pdfName: result.fileName });
    } catch {
      continue;
    }
  }

  if (pdfs.length === 0) {
    throw new Error('No PDFs could be generated for the provided report IDs');
  }

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      for (const pdf of pdfs) {
        try { fs.unlinkSync(pdf.pdfPath); } catch { /* ignore */ }
      }
      resolve({ filePath: zipPath, fileName: zipFileName });
    });

    archive.on('error', reject);
    archive.pipe(output);

    for (const pdf of pdfs) {
      archive.file(pdf.pdfPath, { name: pdf.pdfName });
    }

    archive.finalize();
  });
}
