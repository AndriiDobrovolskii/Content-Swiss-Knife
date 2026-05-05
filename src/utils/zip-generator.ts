import JSZip from 'jszip';
import saveAs from 'file-saver';
import { GeneratedContent, ProcessedImage } from '../app/types';

export const downloadPackage = async (content: GeneratedContent, productName: string) => {
  const zip = new JSZip();
  const safeName = productName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  // 1. Add English HTML
  zip.file(`${safeName}_en.html`, content.mainHtmlEn);

  // 2. Add Translations
  Object.entries(content.translations).forEach(([lang, html]) => {
    zip.file(`${safeName}_${lang.toLowerCase()}.html`, html);
  });

  // 3. Add SEO JSON
  if (content.seoData) {
    zip.file('seo_metadata.json', JSON.stringify(content.seoData, null, 2));

    // 4. Readable SEO Text
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
  saveAs(blob, `${safeName}_content_pack.zip`);
};

export const downloadTextPackage = (content: GeneratedContent, productName: string) => {
  const safeName = productName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  const strip = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  let fullText = `Product: ${productName}\nGenerated: ${new Date().toLocaleString()}\n\n`;
  
  if (content.mainHtmlEn) {
    fullText += `--------------------------------------------------\n`;
    fullText += `LANGUAGE: English (US)\n`;
    fullText += `--------------------------------------------------\n\n`;
    fullText += strip(content.mainHtmlEn).trim();
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
  saveAs(blob, `${safeName}_plain_text.txt`);
};

export const downloadImagesPackage = async (images: ProcessedImage[]) => {
  const zip = new JSZip();
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  
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