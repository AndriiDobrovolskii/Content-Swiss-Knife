import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export async function pdfToText(base64Data) {
  const buffer = Buffer.from(base64Data, 'base64');
  const result = await pdfParse(buffer);
  return result.text || '';
}
