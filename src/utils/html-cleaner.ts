
export function stripCodeFences(text: string): string {
  return text.replace(/```html/g, '').replace(/```/g, '').trim();
}

export const cleanHtmlStructure = (html: string): string => {
  if (!html) return '';
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 1. Remove Junk Tags
  // Identify and remove all <noscript> tags and their content completely.
  doc.querySelectorAll('noscript').forEach(el => el.remove());

  // 2. Unwrap Content Containers
  // Target: <div class="wpb-content-wrapper">.
  doc.querySelectorAll('div.wpb-content-wrapper').forEach(div => {
    const parent = div.parentNode;
    if (parent) {
      while (div.firstChild) {
        parent.insertBefore(div.firstChild, div);
      }
      div.remove();
    }
  });

  // 3. Smart Image Extraction
  
  // A. Picture Tags
  // Extract the inner <img> and remove the <picture> wrapper.
  doc.querySelectorAll('picture').forEach(pic => {
    const img = pic.querySelector('img');
    if (img) {
      pic.replaceWith(img);
    } else {
      pic.remove();
    }
  });

  // B. WordPress Captions
  // Pattern: <div class="wp-caption..."><img...><p class="wp-caption-text">Caption</p></div>
  doc.querySelectorAll('div[class*="wp-caption"]').forEach(div => {
    const img = div.querySelector('img');
    const caption = div.querySelector('p.wp-caption-text');

    if (img && div.parentNode) {
      // Return just the <img> followed immediately by <p>Text</p>
      div.parentNode.insertBefore(img, div);
      
      if (caption) {
        // Remove the class attribute from the caption <p>
        caption.removeAttribute('class');
        div.parentNode.insertBefore(caption, div);
      }
      
      // Remove the wrapper div
      div.remove();
    }
  });

  // C. Anchor Tags
  // If an <a> tag contains only an <img> (ignoring whitespace), replace the <a> with the <img>.
  doc.querySelectorAll('a').forEach(anchor => {
    const imgs = anchor.querySelectorAll('img');
    if (imgs.length === 1) {
      // Check for other content
      const clone = anchor.cloneNode(true) as HTMLElement;
      clone.querySelector('img')?.remove();
      const remainingText = clone.textContent?.trim() || '';
      
      if (remainingText.length === 0) {
         // Safe to unwrap
         anchor.replaceWith(imgs[0]);
      }
    }
  });

  // 4. Heading Hygiene
  // Inside <h2>, <h3>, <h4>: Remove <strong>, <b>, <span> but preserve text.
  doc.querySelectorAll('h2, h3, h4').forEach(heading => {
    heading.querySelectorAll('strong, b, span').forEach(tag => {
      const parent = tag.parentNode;
      if (parent) {
        while (tag.firstChild) {
          parent.insertBefore(tag.firstChild, tag);
        }
        tag.remove();
      }
    });
  });

  // 5. Tag Replacement
  // Replace all <pre> tags with <small> tags, preserving inner content.
  doc.querySelectorAll('pre').forEach(pre => {
    const small = doc.createElement('small');
    small.innerHTML = pre.innerHTML;
    pre.replaceWith(small);
  });

  // Replace <p><br /></p> or <p><br/></p> with <br> tag
  doc.querySelectorAll('p').forEach(p => {
    if (p.innerHTML.trim() === '<br>' || p.innerHTML.trim() === '<br/>' || p.innerHTML.trim() === '<br />') {
      const br = doc.createElement('br');
      p.replaceWith(br);
    }
  });

  // Replace all <b> tags with <strong> tags
  doc.querySelectorAll('b').forEach(b => {
    const strong = doc.createElement('strong');
    strong.innerHTML = b.innerHTML;
    b.replaceWith(strong);
  });

  // 6. YouTube Iframe Standardization
  doc.querySelectorAll('iframe').forEach(iframe => {
    const src = iframe.getAttribute('src') || '';
    
    // Trigger: Detect YouTube URLs
    if (src.includes('youtube.com') || src.includes('youtu.be')) {
      
      // A. URL Modification (Ensure rel=0)
      try {
        let urlObj: URL | null = null;
        let isProtocolRelative = src.startsWith('//');
        
        if (src.startsWith('http') || isProtocolRelative) {
           const fullUrl = isProtocolRelative ? 'https:' + src : src;
           urlObj = new URL(fullUrl);
           
           if (urlObj.searchParams.get('rel') !== '0') {
              urlObj.searchParams.set('rel', '0');
              const newSrc = isProtocolRelative 
                ? urlObj.toString().replace(/^https:/, '') 
                : urlObj.toString();
              iframe.setAttribute('src', newSrc);
           }
        } else {
           // Fallback for relative paths or others
           if (!src.includes('rel=0')) {
             const separator = src.includes('?') ? '&' : '?';
             iframe.setAttribute('src', `${src}${separator}rel=0`);
           }
        }
      } catch (e) {
        // Safety fallback
         if (!src.includes('rel=0')) {
             const separator = src.includes('?') ? '&' : '?';
             iframe.setAttribute('src', `${src}${separator}rel=0`);
         }
      }

      // B. Attribute Purge & Style
      const preserveAttrs = ['src', 'title', 'allow', 'allowfullscreen', 'loading', 'referrerpolicy'];
      const attrsToRemove: string[] = [];
      Array.from(iframe.attributes).forEach(attr => {
        if (!preserveAttrs.includes(attr.name)) {
          attrsToRemove.push(attr.name);
        }
      });
      attrsToRemove.forEach(name => iframe.removeAttribute(name));
      
      // Apply strict iframe style
      iframe.setAttribute('style', 'width: 100%; aspect-ratio: 16 / 9; border: none;');

      // C. Wrapper Transformation
      const parent = iframe.parentNode;
      const wrapperStyle = 'max-width: 1200px; width: 100%; margin: 0 auto;';
      
      if (parent) {
        if (parent.nodeName === 'P') {
          // Replace <p> with <div>
          const div = doc.createElement('div');
          div.setAttribute('style', wrapperStyle);
          
          // Move all children from P to DIV
          while (parent.firstChild) {
            div.appendChild(parent.firstChild);
          }
          
          if (parent instanceof Element) {
            parent.replaceWith(div);
          } else {
            // Fallback for Node types that might not have replaceWith (though unlikely for a 'P' nodeName)
            parent.parentNode?.replaceChild(div, parent);
          }
        } else {
          // Check if parent is already a dedicated wrapper to avoid double wrapping?
          // For safety and strictness, we wrap in the styled div to ensure layout.
          const div = doc.createElement('div');
          div.setAttribute('style', wrapperStyle);
          
          iframe.replaceWith(div);
          div.appendChild(iframe);
        }
      }
    }
  });

  // 7. Image Optimization
  doc.querySelectorAll('img').forEach(img => {
    // Source Fix
    const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
    if (dataSrc) {
      img.setAttribute('src', dataSrc);
    }

    // Attribute Purge
    // KEEP: src, alt, title, width, height.
    const allowedAttrs = ['src', 'alt', 'title', 'width', 'height'];
    
    const attrsToRemove: string[] = [];
    Array.from(img.attributes).forEach(attr => {
       if (!allowedAttrs.includes(attr.name)) {
         attrsToRemove.push(attr.name);
       }
    });

    attrsToRemove.forEach(name => img.removeAttribute(name));

    // Apply strict responsive style
    img.setAttribute('style', 'max-width: 100%; height: auto;');
  });

  return doc.body.innerHTML;
};
