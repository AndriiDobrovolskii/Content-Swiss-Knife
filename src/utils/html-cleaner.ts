
import { ensureRel0 } from './video-url';
import { wrapImageFigures } from './image-figure';

const SCHEMA_TYPE_SELECTOR = (name: string) => `[itemtype$="/${name}"]`;

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

  // 2b. Schema.org Structural Unwrapping
  // Flatten HowTo / FAQPage markup to plain heading/paragraph structure — the
  // wrapper elements exist only to carry microdata, which this cleaner removes.

  const unwrap = (el: Element) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    el.remove();
  };

  // HowTo: the wrapping <section> already has an itemprop="name" heading as its
  // first child, so unwrapping preserves it verbatim — no heading is invented.
  doc.querySelectorAll(SCHEMA_TYPE_SELECTOR('HowTo')).forEach(unwrap);
  doc.querySelectorAll(SCHEMA_TYPE_SELECTOR('HowToStep')).forEach(unwrap);

  // FAQPage: unlike HowTo, the section itself carries no heading. Insert a fixed
  // "Frequently Asked Questions" heading only when one isn't already present.
  doc.querySelectorAll(SCHEMA_TYPE_SELECTOR('FAQPage')).forEach(section => {
    const prev = section.previousElementSibling;
    if (!prev || !/^H[1-6]$/.test(prev.tagName)) {
      const heading = doc.createElement('h2');
      heading.textContent = 'Frequently Asked Questions';
      section.parentNode?.insertBefore(heading, section);
    }
    unwrap(section);
  });
  doc.querySelectorAll(SCHEMA_TYPE_SELECTOR('Question')).forEach(unwrap);
  doc.querySelectorAll(SCHEMA_TYPE_SELECTOR('Answer')).forEach(unwrap);

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

  // 5b. Table Simplification
  // Strip Bootstrap classes / scope attrs and demote row-label <th> cells to
  // plain <td> — the outer .table-responsive wrapper div is left untouched.
  doc.querySelectorAll('table').forEach(table => table.removeAttribute('class'));
  doc.querySelectorAll('th').forEach(th => th.removeAttribute('scope'));
  doc.querySelectorAll('tbody > tr').forEach(row => {
    const first = row.firstElementChild;
    if (first && first.tagName === 'TH') {
      const td = doc.createElement('td');
      td.innerHTML = first.innerHTML;
      Array.from(first.attributes).forEach(attr => td.setAttribute(attr.name, attr.value));
      first.replaceWith(td);
    }
  });

  // 6. YouTube Iframe Standardization
  doc.querySelectorAll('iframe').forEach(iframe => {
    const src = iframe.getAttribute('src') || '';
    
    // Trigger: Detect YouTube URLs
    if (src.includes('youtube.com') || src.includes('youtu.be')) {
      
      // A. URL Modification (Ensure rel=0)
      iframe.setAttribute('src', ensureRel0(src));

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

  // 7b. Generic Microdata Strip
  // Mop up any remaining Schema.org attributes (e.g. on spec-table tr/th/td)
  // left after the targeted unwrapping/simplification passes above.
  doc.querySelectorAll('[itemscope], [itemtype], [itemprop]').forEach(el => {
    el.removeAttribute('itemscope');
    el.removeAttribute('itemtype');
    el.removeAttribute('itemprop');
  });

  // 8. Figure Wrapping
  // Delegate to the same canonical <figure>/<figcaption> convention the
  // Generator pipeline uses. Never invents a <figcaption> — it only reuses one
  // already present as a trailing sibling of the <img>.
  return wrapImageFigures(doc.body.innerHTML);
};

/**
 * stripTiptapArtifacts
 *
 * Deterministic cleanup for HTML round-tripped through the TipTap-based
 * HtmlEditorComponent. Scope starts empty/minimal — grow it only when a
 * concrete artifact is actually observed (e.g. a possible trailing empty
 * <p> from StarterKit's TrailingNode extension). Not a general HTML
 * sanitizer. Pure function, no LLM, mirrors output-validator.ts /
 * html-cleaner.ts style.
 */
export function stripTiptapArtifacts(html: string): string {
  if (!html) return '';

  const doc = new DOMParser().parseFromString(html, 'text/html');

  // StarterKit's TrailingNode extension can leave an empty paragraph at the
  // very end of the document so the cursor always has somewhere to land
  // after a trailing atom node (image/table/etc.) — never present in
  // generator output, not meaningful once copied out.
  const last = doc.body.lastElementChild;
  if (last && last.tagName === 'P' && last.innerHTML.trim() === '') {
    last.remove();
  }

  return doc.body.innerHTML;
}

const DANGEROUS_URL_PATTERN = /^\s*(javascript|data):/i;

/**
 * sanitizeUntrustedHtml
 *
 * Because the TipTap schema's generic passthrough node/mark (genericBlock,
 * genericInlineSpan) and global-attributes extension deliberately preserve
 * arbitrary class/style/href/src verbatim (the whole point of the fidelity
 * design in HtmlEditorComponent), this strips the handful of attack
 * surfaces that verbatim preservation would otherwise let through: inline
 * event-handler attributes, `javascript:`/`data:` URLs in href/src, and
 * <script>/<style> tags entirely. Deliberately narrow — not a general
 * sanitizer library. Called on both load (before the HTML reaches TipTap)
 * and on copy (before the final clipboard write), as two independent gates.
 */
export function sanitizeUntrustedHtml(html: string): string {
  if (!html) return '';

  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.querySelectorAll('script, style').forEach(el => el.remove());

  doc.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (/^on/i.test(attr.name)) {
        el.removeAttribute(attr.name);
        return;
      }
      if ((attr.name === 'href' || attr.name === 'src') && DANGEROUS_URL_PATTERN.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
}
