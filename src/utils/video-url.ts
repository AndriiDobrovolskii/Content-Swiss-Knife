/** Ensure `rel=0` on a YouTube/Vimeo iframe src, preserving the URL otherwise. */
export function ensureRel0(src: string): string {
  try {
    const isProtocolRelative = src.startsWith('//');
    if (src.startsWith('http') || isProtocolRelative) {
      const urlObj = new URL(isProtocolRelative ? 'https:' + src : src);
      if (urlObj.searchParams.get('rel') !== '0') {
        urlObj.searchParams.set('rel', '0');
        return isProtocolRelative ? urlObj.toString().replace(/^https:/, '') : urlObj.toString();
      }
      return src;
    }
    if (!src.includes('rel=0')) {
      const separator = src.includes('?') ? '&' : '?';
      return `${src}${separator}rel=0`;
    }
    return src;
  } catch {
    if (!src.includes('rel=0')) {
      const separator = src.includes('?') ? '&' : '?';
      return `${src}${separator}rel=0`;
    }
    return src;
  }
}
