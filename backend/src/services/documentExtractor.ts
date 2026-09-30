import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFParser = require('pdf2json');

export interface ExtractedPage {
  page: number;
  text: string;
}

export interface ExtractedDocument {
  total_pages: number;
  pages: ExtractedPage[];
}

const parsePDF = (buffer: Buffer): Promise<ExtractedPage[]> => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      const pages: ExtractedPage[] = [];
      if (pdfData.Pages) {
        pdfData.Pages.forEach((page: any, index: number) => {
          const text = page.Texts
            ?.map((t: any) => decodeURIComponent(t.R?.[0]?.T || ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim() || '';
          if (text) {
            pages.push({ page: index + 1, text });
          }
        });
      }
      resolve(pages);
    });
    
    pdfParser.on('pdfParser_dataError', (err: any) => {
      reject(new Error(err.parserError || 'PDF parsing failed'));
    });
    
    pdfParser.parseBuffer(buffer);
  });
};

export const extractTextFromDocument = async (
  filePath: string
): Promise<{ success: boolean; extracted?: ExtractedDocument; error?: string }> => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const buffer = fs.readFileSync(filePath);

    let extracted: ExtractedDocument;

    if (ext === '.txt') {
      const text = buffer.toString('utf-8').replace(/\s+/g, ' ').trim();
      if (!text) return { success: false, error: 'No text found in file' };
      extracted = { total_pages: 1, pages: [{ page: 1, text }] };

    } else if (ext === '.pdf') {
      const pages = await parsePDF(buffer);
      if (pages.length === 0) {
        return { success: false, error: 'No text could be extracted from PDF' };
      }
      extracted = { total_pages: pages.length, pages };

    } else if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.extractRawText({ buffer });
      const fullText = result.value.trim();
      if (!fullText) return { success: false, error: 'No text could be extracted from document' };

      const sections = fullText
        .split(/\n{2,}/)
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(s => s.length > 0);

      const CHARS_PER_PAGE = 3000;
      const pages: ExtractedPage[] = [];
      let currentPage = '';
      let pageNum = 1;

      for (const section of sections) {
        if (currentPage.length + section.length > CHARS_PER_PAGE && currentPage.length > 0) {
          pages.push({ page: pageNum++, text: currentPage.trim() });
          currentPage = section;
        } else {
          currentPage += (currentPage ? ' ' : '') + section;
        }
      }
      if (currentPage.trim()) pages.push({ page: pageNum, text: currentPage.trim() });

      extracted = { total_pages: pages.length, pages };

    } else {
      return { success: false, error: `Unsupported file type: ${ext}` };
    }

    return { success: true, extracted };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to extract text' };
  }
};

export const joinPagesForLLM = (extracted: ExtractedDocument): string => {
  return extracted.pages.map(p => p.text).join('\n\n');
};
