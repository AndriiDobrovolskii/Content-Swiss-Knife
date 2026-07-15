import JSZip from 'jszip';
import saveAs from 'file-saver';
import { GeneratedContent, ProcessedImage } from '../app/types';
import { getStore, taskLangToIso } from '../prompt-core/constants';
import { sortUkrainianFirst, sortUkrainianFirstIso } from './locale-sort';

function buildTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

const sanitize = (s: string) => s.replace(/[^a-z0-9]/gi, '_').toLowerCase();

/** [Site]_[Product-name]_[timestamp] — site segment omitted when unavailable. */
function buildFilePrefix(content: GeneratedContent, productName: string): string {
  const safeSite = content.website?.name ? sanitize(content.website.name) : '';
  const safeName = sanitize(productName);
  return [safeSite, safeName].filter(Boolean).join('_');
}

export const downloadPackage = async (content: GeneratedContent, productName: string) => {
  const zip = new JSZip();
  const prefix = buildFilePrefix(content, productName);
  const ts = buildTimestamp();
  const storeName = content.website?.name ?? '';
  const store = getStore(storeName);

  // Determine English ISO code for this store (e.g. 'en-GB', 'en-ES', 'en-US')
  const enIso = store.languages.find(l => l.startsWith('en-')) ?? 'en-GB';
  // mainHtmlUa holds the actual base description — uk-UA under the current single-master
  // pipeline (see GeneratedContent.mainHtmlLocale).
  const mainIso = content.mainHtmlLocale ?? enIso;

  // 1. Base description
  zip.file(`description_${mainIso}.html`, content.mainHtmlUa);

  // 2. Translations — sort so Ukrainian comes first
  const sortedKeys = Object.keys(content.translations).sort(sortUkrainianFirst);
  sortedKeys.forEach(key => {
    const iso = taskLangToIso(key, storeName);
    zip.file(`description_${iso}.html`, content.translations[key]);
  });

  // 3. FAQ artifacts — schema-free, for Journal theme FAQ module
  if (content.faqArtifacts) {
    const faqEntries = Object.entries(content.faqArtifacts).sort(([a], [b]) => sortUkrainianFirstIso(a, b));
    faqEntries.forEach(([iso, html]) => { if (html) zip.file(`faq_${iso}.html`, html); });
  }

  // 4. Slugs JSON
  if (content.slugData) {
    zip.file('slugs.json', JSON.stringify(content.slugData, null, 2));
  }

  // 5. SEO JSON
  if (content.seoData) {
    zip.file('seo_metadata.json', JSON.stringify(content.seoData, null, 2));

    // 6. Readable SEO text
    let seoText = `SEO Report for ${content.seoData.site_name}\n\n`;
    content.seoData.seo_data.forEach(item => {
      seoText += `[${item.language}]\n`;
      seoText += `H1: ${item.h1}\n`;
      seoText += `Title: ${item.meta_title}\n`;
      seoText += `Desc: ${item.meta_description}\n`;
      seoText += `----------------------------------------\n`;
    });
    zip.file('seo_readable.txt', seoText);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${prefix}_${ts}.zip`);
};

export const downloadTextPackage = (content: GeneratedContent, productName: string) => {
  const prefix = buildFilePrefix(content, productName);
  const ts = buildTimestamp();

  const strip = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  let fullText = `Product: ${productName}\nGenerated: ${new Date().toLocaleString()}\n\n`;

  if (content.mainHtmlUa) {
    fullText += `--------------------------------------------------\n`;
    fullText += `LANGUAGE: ${content.mainHtmlLocale ?? 'English (US)'}\n`;
    fullText += `--------------------------------------------------\n\n`;
    fullText += strip(content.mainHtmlUa).trim();
    fullText += `\n\n\n`;
  }

  Object.entries(content.translations).forEach(([lang, html]) => {
    fullText += `--------------------------------------------------\n`;
    fullText += `LANGUAGE: ${lang}\n`;
    fullText += `--------------------------------------------------\n\n`;
    fullText += strip(html).trim();
    fullText += `\n\n\n`;
  });

  const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
  saveAs(blob, `${prefix}_${ts}.txt`);
};

export const downloadImagesPackage = async (images: ProcessedImage[]) => {
  const zip = new JSZip();
  const timestamp = buildTimestamp();
  
  // Map to track filenames and handle duplicates
  const nameMap = new Map<string, number>();

  images.forEach(img => {
     let ext = img.format.split('/')[1];
     if (ext === 'jpeg') ext = 'jpg';
     
     // Get base name
     let baseName = img.originalName;
     const lastDotIndex = baseName.lastIndexOf('.');
     if (lastDotIndex > -1) {
        baseName = baseName.substring(0, lastDotIndex);
     }
     
     let fileName = `${baseName}.${ext}`;
     
     // Handle collisions by appending (n)
     if (nameMap.has(fileName)) {
       const count = nameMap.get(fileName)! + 1;
       nameMap.set(fileName, count);
       fileName = `${baseName}_(${count}).${ext}`;
     } else {
       nameMap.set(fileName, 0);
     }

     zip.file(fileName, img.blob);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `images_pack_${timestamp}.zip`);
};