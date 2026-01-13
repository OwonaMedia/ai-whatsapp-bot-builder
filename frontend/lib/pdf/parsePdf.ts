export type ParsedPdfResult = {
  text: string;
  pageCount: number;
  pages: Array<{ text: string; num: number }>;
};

export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedPdfResult> {
  // Use require for pdf-parse to avoid issues with Next.js 15 build-time static analysis
  const pdf = require('pdf-parse');

  try {
    const result = await pdf(buffer);
    const pages = Array.isArray(result.pages) ? result.pages : [];
    const pageCount =
      typeof result.numpages === 'number'
        ? result.numpages
        : (typeof result.num_pages === 'number' ? result.num_pages : pages.length);

    return {
      text: result.text ?? '',
      pageCount,
      pages,
    };
  } catch (error: any) {
    console.error('[parsePdfBuffer] Error parsing PDF:', error);
    throw new Error(`PDF parsing failed: ${error.message || 'Unknown error'}`);
  }
}

