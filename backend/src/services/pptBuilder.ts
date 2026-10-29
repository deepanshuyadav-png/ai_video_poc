import path from 'path';
import PptxGenJS from 'pptxgenjs';
import { FOLDERS } from '../config/storage';
import { SafetyProtocol } from './researchSynthesizer';
import { PubmedPaper } from './pubmedService';

/**
 * Builds a safety-protocol .pptx from the synthesized sections and the cited
 * papers, then writes it into the shared storage ppts/ folder (S3 local
 * fallback). Returns the storage-relative reference (e.g. "ppts/<file>.pptx")
 * to persist on research_requests.ppt_path.
 */

const BRAND = '5B4FE0';
const DARK = '1E2130';
const GRAY = '6B7280';

export const buildSafetyProtocolPpt = async (
  protocol: SafetyProtocol,
  papers: PubmedPaper[],
  requestId: string
): Promise<{ success: boolean; pptPath?: string; error?: string }> => {
  try {
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
    pptx.layout = 'WIDE';
    pptx.author = 'Medical Video POC';
    pptx.title = protocol.title;

    // --- Title slide ---
    const title = pptx.addSlide();
    title.background = { color: 'F6F7FB' };
    title.addText(protocol.title, {
      x: 0.8,
      y: 2.6,
      w: 11.7,
      h: 1.5,
      fontSize: 34,
      bold: true,
      color: DARK,
      align: 'left',
    });
    title.addText('Generated safety protocol — grounded in PubMed research', {
      x: 0.8,
      y: 4.1,
      w: 11.7,
      h: 0.6,
      fontSize: 16,
      color: GRAY,
    });
    title.addText(`${papers.length} source paper(s) cited`, {
      x: 0.8,
      y: 4.7,
      w: 11.7,
      h: 0.5,
      fontSize: 13,
      color: BRAND,
    });

    // --- One slide per protocol section ---
    for (const section of protocol.sections || []) {
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };
      slide.addText(section.heading || 'Section', {
        x: 0.6,
        y: 0.4,
        w: 12.1,
        h: 0.9,
        fontSize: 26,
        bold: true,
        color: BRAND,
      });

      const bullets = (section.bullets || []).filter((b) => b && b.trim());
      if (bullets.length > 0) {
        slide.addText(
          bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
          {
            x: 0.8,
            y: 1.5,
            w: 11.7,
            h: 5.4,
            fontSize: 16,
            color: DARK,
            valign: 'top',
            lineSpacingMultiple: 1.2,
          }
        );
      } else {
        slide.addText('No supported points for this section.', {
          x: 0.8,
          y: 1.5,
          w: 11.7,
          h: 1,
          fontSize: 15,
          italic: true,
          color: GRAY,
        });
      }
    }

    // --- References slide ---
    const refs = pptx.addSlide();
    refs.background = { color: 'FFFFFF' };
    refs.addText('References', {
      x: 0.6,
      y: 0.4,
      w: 12.1,
      h: 0.9,
      fontSize: 26,
      bold: true,
      color: BRAND,
    });

    if (papers.length > 0) {
      const refItems = papers.map((p) => {
        const meta = [p.authors, p.journal, p.pubYear].filter(Boolean).join('. ');
        return {
          text: `[PMID: ${p.pmid}] ${p.title}${meta ? ' — ' + meta : ''}  (${p.url})`,
          options: { bullet: true, breakLine: true, fontSize: 12, color: DARK },
        };
      });
      refs.addText(refItems, {
        x: 0.8,
        y: 1.5,
        w: 11.7,
        h: 5.4,
        valign: 'top',
        lineSpacingMultiple: 1.1,
      });
    }

    const fileName = `safety-protocol-${requestId}-${Date.now()}.pptx`;
    const absPath = path.join(FOLDERS.ppts, fileName);
    await pptx.writeFile({ fileName: absPath });

    // Storage-relative reference, matching how documents/videos are referenced.
    return { success: true, pptPath: path.join('ppts', fileName) };
  } catch (error) {
    console.error('PPT build error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to build PPT' };
  }
};
